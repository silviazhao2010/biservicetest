from flask import Blueprint, request, jsonify
from app.services.report_service import ReportService

bp = Blueprint('reports', __name__)
service = ReportService()

@bp.route('', methods=['GET'])
def get_reports():
    """获取报表列表"""
    try:
        reports = service.get_all_reports()
        return jsonify({
            'code': 200,
            'data': [r.to_dict() for r in reports],
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('', methods=['POST'])
def create_report():
    """创建报表"""
    try:
        data = request.get_json()
        report = service.create_report(
            name=data['name'],
            description=data.get('description', ''),
            config=data.get('config', {}),
            created_by=data.get('created_by', ''),
        )
        return jsonify({
            'code': 200,
            'data': report.to_dict(),
        }), 201
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """获取报表详情"""
    try:
        report = service.get_report(report_id)
        if not report:
            return jsonify({
                'code': 404,
                'message': 'Report not found',
            }), 404
        return jsonify({
            'code': 200,
            'data': report.to_dict(),
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('/<int:report_id>', methods=['PUT'])
def update_report(report_id):
    """更新报表"""
    try:
        data = request.get_json()
        report = service.update_report(
            report_id=report_id,
            name=data.get('name'),
            description=data.get('description'),
            config=data.get('config'),
        )
        return jsonify({
            'code': 200,
            'data': report.to_dict(),
        })
    except ValueError as e:
        return jsonify({
            'code': 404,
            'message': str(e),
        }), 404
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

@bp.route('/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """删除报表"""
    try:
        success = service.delete_report(report_id)
        if not success:
            return jsonify({
                'code': 404,
                'message': 'Report not found',
            }), 404
        return jsonify({
            'code': 200,
            'message': 'Report deleted successfully',
        })
    except Exception as e:
        return jsonify({
            'code': 500,
            'message': str(e),
        }), 500

