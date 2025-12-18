from flask import Flask
from flask_cors import CORS
from app.config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 启用CORS支持
    CORS(app)
    
    # 注册Blueprint
    from app.api import datasets, reports, data
    app.register_blueprint(datasets.bp, url_prefix='/api/datasets')
    app.register_blueprint(reports.bp, url_prefix='/api/reports')
    app.register_blueprint(data.bp, url_prefix='/api/data')
    
    return app

