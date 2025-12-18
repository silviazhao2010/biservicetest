from app.models.report import Report

class ReportService:
    @staticmethod
    def create_report(name: str, description: str, config: dict, created_by: str = '') -> Report:
        report = Report(
            name=name,
            description=description,
            config=config,
            created_by=created_by,
        )
        return report.save()
    
    @staticmethod
    def get_report(report_id: int) -> Report:
        return Report.get_by_id(report_id)
    
    @staticmethod
    def get_all_reports() -> list:
        return Report.get_all()
    
    @staticmethod
    def update_report(report_id: int, name: str = None, description: str = None, config: dict = None) -> Report:
        report = Report.get_by_id(report_id)
        if not report:
            raise ValueError(f"Report {report_id} not found")
        
        if name is not None:
            report.name = name
        if description is not None:
            report.description = description
        if config is not None:
            report.config = config
        
        return report.save()
    
    @staticmethod
    def delete_report(report_id: int) -> bool:
        report = Report.get_by_id(report_id)
        if not report:
            return False
        return report.delete()

