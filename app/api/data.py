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
    """获取数据表数据，支持可选的table_name，当未指定时根据过滤条件自动选择表"""
    try:
        data = request.get_json()
        result = service.get_table_data(
            dataset_id=data['dataset_id'],
            table_name=data.get('table_name'),  # 改为可选
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
            'table_name': result.get('table_name'),  # 返回实际使用的表名
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

@bp.route('/insert', methods=['POST'])
def insert_data():
    """插入数据到数据表"""
    try:
        data = request.get_json()
        result = service.insert_table_data(
            dataset_id=data['dataset_id'],
            table_name=data['table_name'],
            data=data['data'],
        )
        return jsonify({
            'code': 200,
            'data': result,
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

