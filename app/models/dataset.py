import sqlite3
from datetime import datetime
from typing import List, Optional
from app.config import Config

class Dataset:
    def __init__(self, id: int = None, name: str = '', description: str = '', 
                 database_path: str = '', created_at: str = None, updated_at: str = None):
        self.id = id
        self.name = name
        self.description = description
        self.database_path = database_path
        self.created_at = created_at or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.updated_at = updated_at or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'database_path': self.database_path,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
    
    @staticmethod
    def get_all() -> List['Dataset']:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, database_path, created_at, updated_at
            FROM datasets
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [Dataset(
            id=row['id'],
            name=row['name'],
            description=row['description'] or '',
            database_path=row['database_path'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
        ) for row in rows]
    
    @staticmethod
    def get_by_id(dataset_id: int) -> Optional['Dataset']:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, database_path, created_at, updated_at
            FROM datasets
            WHERE id = ?
        ''', (dataset_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return Dataset(
                id=row['id'],
                name=row['name'],
                description=row['description'] or '',
                database_path=row['database_path'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
            )
        return None
    
    def save(self) -> 'Dataset':
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        if self.id:
            # 更新
            cursor.execute('''
                UPDATE datasets
                SET name = ?, description = ?, database_path = ?, updated_at = ?
                WHERE id = ?
            ''', (self.name, self.description, self.database_path, 
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S'), self.id))
        else:
            # 插入
            cursor.execute('''
                INSERT INTO datasets (name, description, database_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (self.name, self.description, self.database_path, 
                  self.created_at, self.updated_at))
            self.id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return self

