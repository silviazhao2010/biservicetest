import os
from pathlib import Path

class Config:
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 数据库配置
    BASE_DIR = Path(__file__).parent.parent
    DATABASE_DIR = BASE_DIR / 'database'
    DATABASE_PATH = DATABASE_DIR / 'system.db'
    DATASETS_DIR = BASE_DIR / 'datasets'
    
    # 确保目录存在
    DATABASE_DIR.mkdir(exist_ok=True)
    DATASETS_DIR.mkdir(exist_ok=True)

