from sqlalchemy import inspect, text


def ensure_runtime_schema(connection) -> None:
    inspector = inspect(connection)
    if "reports" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("reports")}
    dialect = connection.dialect.name
    additions: list[str] = []
    json_type = "JSONB" if dialect == "postgresql" else "JSON"

    if "report_metadata" not in columns:
        additions.append(f"ALTER TABLE reports ADD COLUMN report_metadata {json_type}")
    if "parameters" not in columns:
        additions.append(f"ALTER TABLE reports ADD COLUMN parameters {json_type}")
    if "patient_name" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN patient_name VARCHAR(255)")
    if "lab_name" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN lab_name VARCHAR(255)")
    if "doctor_name" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN doctor_name VARCHAR(255)")
    if "sample_type" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN sample_type VARCHAR(64)")
    if "machine_used" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN machine_used VARCHAR(255)")
    if "report_date" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN report_date DATE")
    if "sample_collection_date" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN sample_collection_date DATE")
    if "report_generation_date" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN report_generation_date DATE")
    if "report_time" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN report_time TIME")
    if "date_confidence" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN date_confidence VARCHAR(16)")

    for statement in additions:
        connection.execute(text(statement))

    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_reports_report_date ON reports (report_date)"))
