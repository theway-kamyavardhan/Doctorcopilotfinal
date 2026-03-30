# DoctorCopilot Backend

Production-oriented FastAPI backend for an AI-first healthcare SaaS platform. It supports JWT auth, doctor/patient role separation, case management, report uploads, AI-driven medical extraction, structured storage, and case-based real-time chat.

## Project Structure

```text
.
|-- app
|   |-- api
|   |   `-- v1
|   |       |-- endpoints
|   |       |   |-- auth.py
|   |       |   |-- cases.py
|   |       |   |-- doctors.py
|   |       |   |-- patients.py
|   |       |   `-- reports.py
|   |       `-- router.py
|   |-- core
|   |   |-- config.py
|   |   |-- exceptions.py
|   |   `-- security.py
|   |-- db
|   |   |-- base.py
|   |   `-- session.py
|   |-- models
|   |   |-- case.py
|   |   |-- doctor.py
|   |   |-- enums.py
|   |   |-- message.py
|   |   |-- mixins.py
|   |   |-- note.py
|   |   |-- patient.py
|   |   |-- processing.py
|   |   |-- report.py
|   |   `-- user.py
|   |-- schemas
|   |   |-- auth.py
|   |   |-- case.py
|   |   |-- common.py
|   |   |-- doctor.py
|   |   |-- message.py
|   |   |-- note.py
|   |   |-- patient.py
|   |   |-- report.py
|   |   `-- user.py
|   |-- services
|   |   |-- ai
|   |   |   |-- client.py
|   |   |   |-- prompts.py
|   |   |   `-- schemas.py
|   |   |-- processing
|   |   |   |-- ocr.py
|   |   |   `-- orchestrator.py
|   |   |-- storage
|   |   |   `-- local.py
|   |   |-- auth.py
|   |   |-- cases.py
|   |   |-- doctors.py
|   |   |-- patients.py
|   |   `-- reports.py
|   |-- utils
|   |   `-- dependencies.py
|   |-- websockets
|   |   `-- manager.py
|   `-- main.py
|-- storage
|   `-- uploads
|-- tests
|-- .env.example
`-- requirements.txt
```

## Database Coverage

- `users`: auth identity, password hash, role, account status
- `patients`: patient profile and demographics
- `doctors`: doctor profile, license, specialization
- `cases`: doctor-patient care context with lifecycle tracking
- `reports`: uploaded files, raw text, report status, report type
- `extracted_data`: validated AI JSON payload per report
- `report_insights`: derived structured findings and alerts
- `messages`: case-scoped chat stream
- `clinical_notes`: doctor-authored case notes
- `processing_logs`: upload, OCR, AI, normalization, storage audit trail

## Upload to Processed Flow

1. Patient uploads a PDF/image via `POST /api/v1/reports/upload`.
2. Backend stores the file locally and creates a report row with status `uploaded`.
3. OCR/text extraction runs using PDF parsing or OCR fallback.
4. OpenAI structured extraction converts raw text into strict JSON.
5. Backend validates the JSON with Pydantic, normalizes metrics/terms, stores `extracted_data` and `report_insights`.
6. Report status changes to `processed` or `failed`, and every step is written to `processing_logs`.

## Google OAuth Design

- Keep `users` as the canonical auth table and store Google subject in `google_sub`.
- Add `/api/v1/auth/google/callback` later to exchange the Google token, upsert the `users` row, and mint the same JWT used by password auth.
- Role assignment should stay server-controlled after OAuth signup, not trusted from the client token.

## Example API Flow

1. `POST /api/v1/auth/register/patient`
2. `POST /api/v1/auth/login`
3. `POST /api/v1/reports/upload` with multipart file and optional `case_id`
4. `GET /api/v1/reports/{report_id}`
5. `GET /api/v1/patients/me/insights`
6. Doctor creates or manages a case through `/api/v1/cases`
7. Doctor and patient join `ws://host/api/v1/cases/ws/{case_id}?token=<jwt>` for real-time chat

## OpenAI Integration Note

Structured output behavior follows the official OpenAI docs:

- [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
