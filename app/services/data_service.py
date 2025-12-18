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

