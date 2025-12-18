import sqlite3
import json
from datetime import datetime
from typing import List, Optional
from app.config import Config

class Report:
    def __init__(self, id: int = None, name: str = '', description: str = '',
                 config: dict = None, created_by: str = '', 
                 created_at: str = None, updated_at: str = None):
        self.id = id
        self.name = name
        self.description = description
        self.config = config or {}
        self.created_by = created_by
        self.created_at = created_at or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.updated_at = updated_at or datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'config': self.config,
            'created_by': self.created_by,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
    
    @staticmethod
    def get_all() -> List['Report']:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, config, created_by, created_at, updated_at
            FROM reports
            ORDER BY updated_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        reports = []
        for row in rows:
            try:
                config = json.loads(row['config']) if row['config'] else {}
            except:
                config = {}
            reports.append(Report(
                id=row['id'],
                name=row['name'],
                description=row['description'] or '',
                config=config,
                created_by=row['created_by'] or '',
                created_at=row['created_at'],
                updated_at=row['updated_at'],
            ))
        return reports
    
    @staticmethod
    def get_by_id(report_id: int) -> Optional['Report']:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, config, created_by, created_at, updated_at
            FROM reports
            WHERE id = ?
        ''', (report_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            try:
                config = json.loads(row['config']) if row['config'] else {}
            except:
                config = {}
            return Report(
                id=row['id'],
                name=row['name'],
                description=row['description'] or '',
                config=config,
                created_by=row['created_by'] or '',
                created_at=row['created_at'],
                updated_at=row['updated_at'],
            )
        return None
    
    def save(self) -> 'Report':
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        config_json = json.dumps(self.config)
        
        if self.id:
            # 更新
            cursor.execute('''
                UPDATE reports
                SET name = ?, description = ?, config = ?, updated_at = ?
                WHERE id = ?
            ''', (self.name, self.description, config_json,
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S'), self.id))
        else:
            # 插入
            cursor.execute('''
                INSERT INTO reports (name, description, config, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (self.name, self.description, config_json, self.created_by,
                  self.created_at, self.updated_at))
            self.id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return self
    
    def delete(self) -> bool:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM reports WHERE id = ?', (self.id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return affected > 0

