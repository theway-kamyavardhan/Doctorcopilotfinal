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
    if "report_category" not in columns:
        additions.append("ALTER TABLE reports ADD COLUMN report_category VARCHAR(64)")
    if "report_keywords" not in columns:
        additions.append(f"ALTER TABLE reports ADD COLUMN report_keywords {json_type}")
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

    # Support for Patients table hardening
    inspector = inspect(connection)
    if "patients" in inspector.get_table_names():
        patient_cols = {column["name"] for column in inspector.get_columns("patients")}
        patient_additions: list[str] = []
        if "patient_id" not in patient_cols:
            patient_additions.append("ALTER TABLE patients ADD COLUMN patient_id VARCHAR(32)")
        if "birth_date" not in patient_cols:
            patient_additions.append("ALTER TABLE patients ADD COLUMN birth_date DATE")
        if "medical_history" not in patient_cols:
            patient_additions.append("ALTER TABLE patients ADD COLUMN medical_history TEXT")
        if "personal_api_key_enabled" not in patient_cols:
            patient_additions.append("ALTER TABLE patients ADD COLUMN personal_api_key_enabled BOOLEAN DEFAULT TRUE")
        
        for statement in patient_additions:
            connection.execute(text(statement))

    inspector = inspect(connection)
    if "doctors" in inspector.get_table_names():
        doctor_cols = {column["name"] for column in inspector.get_columns("doctors")}
        doctor_additions: list[str] = []
        if "hospital" not in doctor_cols:
            doctor_additions.append("ALTER TABLE doctors ADD COLUMN hospital VARCHAR(255)")
        if "location" not in doctor_cols:
            doctor_additions.append("ALTER TABLE doctors ADD COLUMN location VARCHAR(255)")
        if "phone_number" not in doctor_cols:
            doctor_additions.append("ALTER TABLE doctors ADD COLUMN phone_number VARCHAR(32)")

        for statement in doctor_additions:
            connection.execute(text(statement))

    inspector = inspect(connection)
    if "users" in inspector.get_table_names():
        user_cols = {column["name"] for column in inspector.get_columns("users")}
        user_additions: list[str] = []
        if "admin_code" not in user_cols:
            user_additions.append("ALTER TABLE users ADD COLUMN admin_code VARCHAR(32)")

        for statement in user_additions:
            connection.execute(text(statement))

    inspector = inspect(connection)
    if "cases" in inspector.get_table_names():
        case_cols = {column["name"] for column in inspector.get_columns("cases")}
        case_additions: list[str] = []
        uuid_type = "UUID" if dialect == "postgresql" else "VARCHAR(36)"
        if "request_origin" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN request_origin VARCHAR(32) DEFAULT 'patient'")
        if "referral_note" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN referral_note TEXT")
        if "referred_by_doctor_id" not in case_cols:
            case_additions.append(f"ALTER TABLE cases ADD COLUMN referred_by_doctor_id {uuid_type}")
        if "report_access_status" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN report_access_status VARCHAR(32) DEFAULT 'not_requested'")
        if "report_access_requested_at" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN report_access_requested_at TIMESTAMP")
        if "report_access_updated_at" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN report_access_updated_at TIMESTAMP")
        if "report_access_requested_by_doctor_id" not in case_cols:
            case_additions.append(f"ALTER TABLE cases ADD COLUMN report_access_requested_by_doctor_id {uuid_type}")
        if "closing_note" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN closing_note TEXT")
        if "closed_by_doctor_id" not in case_cols:
            case_additions.append(f"ALTER TABLE cases ADD COLUMN closed_by_doctor_id {uuid_type}")
        if "closed_at" not in case_cols:
            case_additions.append("ALTER TABLE cases ADD COLUMN closed_at TIMESTAMP")

        for statement in case_additions:
            connection.execute(text(statement))

    # Use IF NOT EXISTS for indexes to avoid conflicts with Metadata creation
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_reports_report_date ON reports (report_date)"))
    # The patient_id index is already handled by the model, but we add IF NOT EXISTS for safety
    try:
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_patients_patient_id ON patients (patient_id)"))
    except Exception:
        # If SQLite version doesn't support IF NOT EXISTS or it's already there
        pass
    try:
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_admin_code ON users (admin_code)"))
    except Exception:
        pass
