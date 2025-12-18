import sqlite3
from pathlib import Path
from typing import List, Dict, Any
from app.models.dataset import Dataset
from app.models.data_table import DataTable
from app.config import Config

class DatasetService:
    @staticmethod
    def get_datasets() -> List[Dataset]:
        return Dataset.get_all()
    
    @staticmethod
    def create_dataset(name: str, description: str, database_name: str = None) -> Dataset:
        """创建数据集，自动创建数据库文件"""
        if not database_name:
            # 如果没有指定数据库名称，使用数据集名称生成
            database_name = name.lower().replace(' ', '_').replace('-', '_')
            # 移除特殊字符
            database_name = ''.join(c for c in database_name if c.isalnum() or c == '_')
        
        # 确保数据库文件名以.db结尾
        if not database_name.endswith('.db'):
            database_name += '.db'
        
        # 构建数据库路径
        database_path = Config.DATASETS_DIR / database_name
        
        # 如果数据库文件已存在，删除它
        if database_path.exists():
            database_path.unlink()
        
        # 创建数据库文件（SQLite会自动创建）
        conn = sqlite3.connect(str(database_path))
        conn.close()
        
        # 创建数据集记录
        dataset = Dataset(
            name=name,
            description=description,
            database_path=str(database_path),
        )
        return dataset.save()
    
    @staticmethod
    def create_table(dataset_id: int, table_name: str, fields: List[Dict[str, Any]]) -> bool:
        """在数据集中创建表"""
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # 构建CREATE TABLE语句
        field_definitions = []
        for field in fields:
            field_name = field['name']
            field_type = field['type'].upper()
            is_primary_key = field.get('primaryKey', False)
            is_not_null = field.get('notNull', False)
            default_value = field.get('default', None)
            
            field_def = f"{field_name} {field_type}"
            
            if is_primary_key:
                field_def += " PRIMARY KEY"
                if field_type == 'INTEGER':
                    field_def += " AUTOINCREMENT"
            
            if is_not_null and not is_primary_key:
                field_def += " NOT NULL"
            
            if default_value is not None and not is_primary_key:
                if isinstance(default_value, str):
                    field_def += f" DEFAULT '{default_value}'"
                else:
                    field_def += f" DEFAULT {default_value}"
            
            field_definitions.append(field_def)
        
        sql = f"CREATE TABLE {table_name} ({', '.join(field_definitions)})"
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            raise ValueError(f"Failed to create table: {str(e)}")
    
    @staticmethod
    def add_column(dataset_id: int, table_name: str, column_name: str, column_type: str, 
                   not_null: bool = False, default_value: Any = None) -> bool:
        """在表中添加字段"""
        dataset = Dataset.get_by_id(dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # SQLite的ALTER TABLE ADD COLUMN语法
        column_def = f"{column_name} {column_type.upper()}"
        
        if not_null:
            column_def += " NOT NULL"
        
        if default_value is not None:
            if isinstance(default_value, str):
                column_def += f" DEFAULT '{default_value}'"
            else:
                column_def += f" DEFAULT {default_value}"
        
        sql = f"ALTER TABLE {table_name} ADD COLUMN {column_def}"
        
        try:
            conn = sqlite3.connect(dataset.database_path)
            cursor = conn.cursor()
            cursor.execute(sql)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            raise ValueError(f"Failed to add column: {str(e)}")
    
    @staticmethod
    def get_tables(dataset_id: int) -> List[DataTable]:
        return DataTable.get_by_dataset(dataset_id)
    
    @staticmethod
    def get_table_schema(dataset_id: int, table_name: str) -> dict:
        tables = DataTable.get_by_dataset(dataset_id)
        for table in tables:
            if table.table_name == table_name:
                return table.schema_info
        return {}

