import sqlite3
import os
from app.config import Config

def init_database():
    """初始化数据库表结构"""
    # 如果系统数据库已存在，先删除
    if Config.DATABASE_PATH.exists():
        print(f"检测到系统数据库已存在，正在删除: {Config.DATABASE_PATH}")
        # 确保所有连接都已关闭
        try:
            # 尝试连接并立即关闭，确保文件未被锁定
            temp_conn = sqlite3.connect(Config.DATABASE_PATH)
            temp_conn.close()
        except Exception:
            pass
        Config.DATABASE_PATH.unlink()
        print("系统数据库已删除")
    
    # 创建系统数据库
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    # 创建数据集表
    cursor.execute('''
        CREATE TABLE datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            database_path VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建报表表
    cursor.execute('''
        CREATE TABLE reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            config TEXT NOT NULL,
            created_by VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("系统数据库创建完成")
    
    # 创建示例数据集数据库
    sample_db_path = Config.DATASETS_DIR / 'sample.db'
    
    # 如果示例数据集数据库已存在，先删除
    if sample_db_path.exists():
        print(f"检测到示例数据集数据库已存在，正在删除: {sample_db_path}")
        # 确保所有连接都已关闭
        try:
            temp_conn = sqlite3.connect(sample_db_path)
            temp_conn.close()
        except Exception:
            pass
        sample_db_path.unlink()
        print("示例数据集数据库已删除")
    
    # 创建示例数据集数据库
    sample_conn = sqlite3.connect(sample_db_path)
    sample_cursor = sample_conn.cursor()
    
    # 创建示例销售表
    sample_cursor.execute('''
        CREATE TABLE sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            product VARCHAR(100),
            amount REAL,
            quantity INTEGER,
            region VARCHAR(50)
        )
    ''')
    
    # 插入示例数据
    sample_data = [
        ('2024-01-01', '产品A', 1000.0, 10, 'north'),
        ('2024-01-02', '产品B', 1500.0, 15, 'south'),
        ('2024-01-03', '产品A', 1200.0, 12, 'north'),
        ('2024-01-04', '产品C', 800.0, 8, 'east'),
        ('2024-01-05', '产品B', 2000.0, 20, 'south'),
        ('2024-01-06', '产品A', 1100.0, 11, 'north'),
        ('2024-01-07', '产品C', 900.0, 9, 'east'),
    ]
    
    sample_cursor.executemany('''
        INSERT INTO sales (date, product, amount, quantity, region)
        VALUES (?, ?, ?, ?, ?)
    ''', sample_data)
    
    sample_conn.commit()
    sample_conn.close()
    print("示例数据集数据库创建完成")
    
    # 在系统数据库中注册示例数据集
    conn = sqlite3.connect(Config.DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO datasets (name, description, database_path)
        VALUES (?, ?, ?)
    ''', ('示例数据集', '包含销售数据的示例数据集', str(sample_db_path)))
    
    conn.commit()
    conn.close()
    
    print("数据库初始化完成！")
    print(f"系统数据库: {Config.DATABASE_PATH}")
    print(f"示例数据集: {sample_db_path}")

if __name__ == '__main__':
    init_database()

