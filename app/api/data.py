from flask import Blueprint, request, jsonify
from app.services.data_service import DataService

bp = Blueprint('data', __name__)
service = DataService()

@bp.route('/query', methods=['POST'])
def query_sql():
    """执行SQL查询"""
    try:
        data = request.get_json()
        result = service.execute_sql(
            dataset_id=data['dataset_id'],
            sql=data['sql'],
            params=data.get('params', []),
        )
        return jsonify({
            'code': 200,
            'data': result['data'],
            'columns': result['columns'],
        })
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
        }), 400
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('/table-data', methods=['POST'])
def get_table_data():
    """获取数据表数据"""
    try:
        data = request.get_json()
        result = service.get_table_data(
            dataset_id=data['dataset_id'],
            table_name=data['table_name'],
            filters=data.get('filters', []),
            limit=data.get('limit', 100),
            offset=data.get('offset', 0),
        )
        return jsonify({
            'code': 200,
            'data': result['data'],
            'columns': result['columns'],
            'total': result['total'],
            'limit': result['limit'],
            'offset': result['offset'],
        })
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
        }), 400
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

