from typing import List
from app.models.dataset import Dataset
from app.models.data_table import DataTable

class DatasetService:
    @staticmethod
    def get_datasets() -> List[Dataset]:
        return Dataset.get_all()
    
    @staticmethod
    def create_dataset(name: str, description: str, database_path: str) -> Dataset:
        dataset = Dataset(
            name=name,
            description=description,
            database_path=database_path,
        )
        return dataset.save()
    
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

