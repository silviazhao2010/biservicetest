import sqlite3
from typing import List, Dict, Any
from app.models.dataset import Dataset

class DataService:
    @staticmethod
    def execute_sql(dataset_id: int, sql: str, params: List[Any] = None) -> Dict:
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        params = params or []
        
        # 简单的SQL安全检查（仅允许SELECT）
        sql_upper = sql.strip().upper()
        if not sql_upper.startswith('SELECT'):
            raise ValueError("Only SELECT queries are allowed")
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            # 获取列名
            columns = [description[0] for description in cursor.description] if cursor.description else []
            
            # 转换为字典列表
            data = [dict(row) for row in rows]
            
            conn.close()
            
            return {
                'data': data,
                'columns': columns,
            }
        except Exception as e:
            raise ValueError(f"SQL execution error: {str(e)}")
    
    @staticmethod
    def find_table_by_filters(dataset_id: int, filters: List[Dict] = None) -> str:
        """根据过滤条件中的字段自动选择表"""
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        filters = filters or []
        
        # 如果没有过滤条件，返回第一个表
        if not filters:
            try:
                conn = sqlite3.connect(dataset.database_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1")
                result = cursor.fetchone()
                conn.close()
                if result:
                    return result[0]
                raise ValueError("No tables found in dataset")
            except Exception as e:
                raise ValueError(f"Find table error: {str(e)}")
        
        # 从过滤条件中提取字段名
        filter_fields = []
        for filter_item in filters:
            field = filter_item.get('field')
            if field:
                filter_fields.append(field.lower())
        
        if not filter_fields:
            # 如果没有有效字段，返回第一个表
            try:
                conn = sqlite3.connect(dataset.database_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1")
                result = cursor.fetchone()
                conn.close()
                if result:
                    return result[0]
                raise ValueError("No tables found in dataset")
            except Exception as e:
                raise ValueError(f"Find table error: {str(e)}")
        
        # 查找包含这些字段的表
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            
            # 获取所有表名
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            
            # 查找包含所有过滤字段的表
            for (table_name,) in tables:
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                table_fields = [col[1].lower() for col in columns]
                
                # 检查表是否包含所有过滤字段
                if all(field in table_fields for field in filter_fields):
                    conn.close()
                    return table_name
            
            # 如果没有找到包含所有字段的表，查找包含最多字段的表
            best_table = None
            best_match_count = 0
            
            for (table_name,) in tables:
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                table_fields = [col[1].lower() for col in columns]
                
                match_count = sum(1 for field in filter_fields if field in table_fields)
                if match_count > best_match_count:
                    best_match_count = match_count
                    best_table = table_name
            
            conn.close()
            
            if best_table:
                return best_table
            else:
                # 如果还是没找到，返回第一个表
                if tables:
                    return tables[0][0]
                raise ValueError("No tables found in dataset")
        except Exception as e:
            raise ValueError(f"Find table error: {str(e)}")
    
    @staticmethod
    def get_table_data(dataset_id: int, table_name: str = None, filters: List[Dict] = None, 
                      limit: int = 100, offset: int = 0) -> Dict:
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        filters = filters or []
        
        # 如果未指定表名，根据过滤条件自动选择表
        if not table_name:
            table_name = DataService.find_table_by_filters(dataset_id, filters)
        
        # 构建WHERE子句
        where_clauses = []
        params = []
        
        for filter_item in filters:
            field = filter_item.get('field')
            operator = filter_item.get('operator', '=')
            value = filter_item.get('value')
            
            if field and value is not None:
                if operator == '>=':
                    where_clauses.append(f"{field} >= ?")
                elif operator == '<=':
                    where_clauses.append(f"{field} <= ?")
                elif operator == '>':
                    where_clauses.append(f"{field} > ?")
                elif operator == '<':
                    where_clauses.append(f"{field} < ?")
                elif operator == 'LIKE':
                    where_clauses.append(f"{field} LIKE ?")
                else:
                    where_clauses.append(f"{field} = ?")
                params.append(value)
        
        where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'
        
        sql = f"SELECT * FROM {table_name} WHERE {where_sql} LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            columns = [description[0] for description in cursor.description] if cursor.description else []
            data = [dict(row) for row in rows]
            
            # 获取总数
            count_sql = f"SELECT COUNT(*) as total FROM {table_name} WHERE {where_sql}"
            cursor.execute(count_sql, params[:-2])  # 去掉LIMIT和OFFSET参数
            total = cursor.fetchone()['total']
            
            conn.close()
            
            return {
                'data': data,
                'columns': columns,
                'total': total,
                'limit': limit,
                'offset': offset,
                'table_name': table_name,  # 返回实际使用的表名
            }
        except Exception as e:
            raise ValueError(f"Query error: {str(e)}")
    
    @staticmethod
    def insert_table_data(dataset_id: int, table_name: str, data: Dict[str, Any]) -> Dict:
        """插入数据到指定表"""
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            
            # 获取表结构，确定哪些字段需要插入
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            
            # 构建字段名和值的列表
            fields = []
            values = []
            placeholders = []
            
            for col_info in columns_info:
                col_name = col_info[1]
                col_type = col_info[2]
                is_pk = bool(col_info[5])
                has_default = col_info[4] is not None
                
                # 如果是主键且自增，跳过
                if is_pk and col_type.upper() == 'INTEGER':
                    continue
                
                # 如果数据中提供了该字段的值，使用提供的值
                if col_name in data:
                    fields.append(col_name)
                    values.append(data[col_name])
                    placeholders.append('?')
                # 如果有默认值，可以跳过
                elif has_default:
                    continue
                # 如果字段不允许为空且没有默认值，必须提供值
                elif col_info[3] == 1 and not has_default:
                    raise ValueError(f"Field {col_name} is required but not provided")
            
            if not fields:
                raise ValueError("No fields to insert")
            
            # 构建INSERT语句
            sql = f"INSERT INTO {table_name} ({', '.join(fields)}) VALUES ({', '.join(placeholders)})"
            
            cursor.execute(sql, values)
            conn.commit()
            
            # 获取插入的行的ID（如果有主键）
            inserted_id = cursor.lastrowid
            
            conn.close()
            
            return {
                'success': True,
                'inserted_id': inserted_id,
                'message': 'Data inserted successfully',
            }
        except Exception as e:
            raise ValueError(f"Insert error: {str(e)}")
    
    @staticmethod
    def find_tables_by_field(dataset_id: int, field_name: str) -> List[Dict[str, Any]]:
        """根据字段名查找包含该字段的表"""
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            
            # 获取所有表名
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = cursor.fetchall()
            
            result = []
            for (table_name,) in tables:
                # 检查表是否包含该字段
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                
                for col in columns:
                    if col[1].lower() == field_name.lower():  # 字段名不区分大小写
                        # 获取表的完整结构信息
                        fields = []
                        for c in columns:
                            fields.append({
                                'name': c[1],
                                'type': c[2],
                                'notnull': bool(c[3]),
                                'default': c[4],
                                'pk': bool(c[5]),
                            })
                        
                        result.append({
                            'table_name': table_name,
                            'display_name': table_name,
                            'schema_info': {
                                'fields': fields,
                            },
                        })
                        break  # 找到字段后，不需要继续检查该表的其他字段
            
            conn.close()
            return result
        except Exception as e:
            raise ValueError(f"Find tables error: {str(e)}")

