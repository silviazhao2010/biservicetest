from flask import Blueprint, request, jsonify
from app.services.dataset_service import DatasetService

bp = Blueprint('datasets', __name__)
service = DatasetService()

@bp.route('', methods=['GET'])
def get_datasets():
    """获取数据集列表"""
    try:
        datasets = service.get_datasets()
        return jsonify({
            'code': 200,
            'data': [ds.to_dict() for ds in datasets],
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('', methods=['POST'])
def create_dataset():
    """创建数据集"""
    try:
        data = request.get_json()
        dataset = service.create_dataset(
            name=data['name'],
            description=data.get('description', ''),
            database_path=data['database_path'],
        )
        return jsonify({
            'code': 200,
            'data': dataset.to_dict(),
        }), 201
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('/<int:dataset_id>/tables', methods=['GET'])
def get_tables(dataset_id):
    """获取数据表列表"""
    try:
        tables = service.get_tables(dataset_id)
        return jsonify({
            'code': 200,
            'data': [table.to_dict() for table in tables],
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

