import sqlite3
import json
from typing import List, Optional
from app.config import Config
from app.models.dataset import Dataset

class DataTable:
    def __init__(self, id: int = None, dataset_id: int = 0, table_name: str = '',
                 display_name: str = '', schema_info: dict = None):
        self.id = id
        self.dataset_id = dataset_id
        self.table_name = table_name
        self.display_name = display_name
        self.schema_info = schema_info or {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'table_name': self.table_name,
            'display_name': self.display_name or self.table_name,
            'schema_info': self.schema_info,
        }
    
    @staticmethod
    def get_by_dataset(dataset_id: int) -> List['DataTable']:
        # 从数据集配置中获取表信息，或直接从数据库读取
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            return []
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            
            # 获取所有表名
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            result = []
            for (table_name,) in tables:
                # 获取表结构
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                
                fields = []
                for col in columns:
                    fields.append({
                        'name': col[1],
                        'type': col[2],
                        'notnull': bool(col[3]),
                        'default': col[4],
                        'pk': bool(col[5]),
                    })
                
                result.append(DataTable(
                    id=len(result) + 1,
                    dataset_id=dataset_id,
                    table_name=table_name,
                    display_name=table_name,
                    schema_info={'fields': fields},
                ))
            
            conn.close()
            return result
        except Exception as e:
            print(f"Error reading tables: {e}")
            return []

