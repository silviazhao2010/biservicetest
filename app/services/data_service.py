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
    def get_table_data(dataset_id: int, table_name: str, filters: List[Dict] = None, 
                      limit: int = 100, offset: int = 0) -> Dict:
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        filters = filters or []
        
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

