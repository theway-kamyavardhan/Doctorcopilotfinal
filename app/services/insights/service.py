from collections import defaultdict
from datetime import date, datetime
from typing import Any
from uuid import UUID

from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.case import Case
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.report import Report
from app.models.user import User
from app.schemas.insights import ParameterPoint, ParameterTrend, PatientInsightsResponse
from app.services.insights.normalization import coerce_numeric_value, normalize_parameter_name, normalize_unit


DEFAULT_REFERENCE_HINTS = {
    "hemoglobin": {"low": 12.0, "high": 17.5},
    "white_blood_cells": {"low": 4000.0, "high": 11000.0},
    "platelets": {"low": 150000.0, "high": 450000.0},
    "vitamin_b12": {"low": 200.0, "high": None},
    "vitamin_d": {"low": 20.0, "high": None},
}


class AIInsightPayload(BaseModel):
    key_findings: list[str] = Field(default_factory=list)
    risk_level: str = "low"
    summary: list[str] = Field(default_factory=list)


class InsightsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.ai_client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def get_patient_insights(self, patient_id: UUID, current_user: User) -> PatientInsightsResponse:
        patient = await self._get_patient(patient_id)
        await self._ensure_access(patient, current_user)
        reports = await self._list_patient_reports(patient.id)
        aggregated = self.aggregate_parameters(reports)
        trends = self.generate_trends(aggregated)
        findings, risk_level = self.detect_abnormal_patterns(trends)
        ai_summary = await self.generate_summary(patient.id, trends, findings, risk_level)
        return PatientInsightsResponse(
            patient_id=patient.id,
            trends=trends,
            key_findings=ai_summary.key_findings or findings,
            risk_level=ai_summary.risk_level or risk_level,
            summary=ai_summary.summary or findings,
        )

    def aggregate_parameters(self, reports: list[Report]) -> dict[str, list[ParameterPoint]]:
        parameter_index: dict[str, list[ParameterPoint]] = defaultdict(list)
        for report in sorted(reports, key=lambda entry: entry.created_at):
            if not report.extracted_data:
                continue
            report_date = report.created_at.date().isoformat()
            key_values = report.extracted_data.key_values or {}
            for raw_name, payload in key_values.items():
                if not isinstance(payload, dict):
                    continue
                parameter_name = normalize_parameter_name(payload.get("name") or raw_name)
                numeric_value = coerce_numeric_value(payload.get("value"))
                if numeric_value is None:
                    continue
                parameter_index[parameter_name].append(
                    ParameterPoint(
                        date=report_date,
                        value=numeric_value,
                        unit=normalize_unit(payload.get("unit")),
                        source_report_id=report.id,
                    )
                )
        return parameter_index

    def generate_trends(self, parameter_index: dict[str, list[ParameterPoint]]) -> dict[str, ParameterTrend]:
        trends: dict[str, ParameterTrend] = {}
        for parameter, points in parameter_index.items():
            ordered = sorted(points, key=lambda point: point.date)
            values = [point.value for point in ordered]
            trend = self._classify_trend(values)
            status = self._classify_status(parameter, values)
            trends[parameter] = ParameterTrend(values=ordered, trend=trend, status=status, latest_unit=ordered[-1].unit if ordered else None)
        return trends

    def detect_abnormal_patterns(self, trends: dict[str, ParameterTrend]) -> tuple[list[str], str]:
        findings: list[str] = []
        risk_level = "low"

        for parameter, trend_data in trends.items():
            values = [point.value for point in trend_data.values]
            if not values:
                continue
            status = trend_data.status
            if status == "consistently_low":
                findings.append(f"{parameter} has remained below the expected range across multiple reports.")
                risk_level = self._max_risk(risk_level, "medium")
            elif status == "consistently_high":
                findings.append(f"{parameter} has remained above the expected range across multiple reports.")
                risk_level = self._max_risk(risk_level, "medium")
            elif status == "sudden_change":
                findings.append(f"{parameter} shows a sudden shift between reports and may need closer review.")
                risk_level = self._max_risk(risk_level, "medium")

        hemoglobin_status = trends.get("hemoglobin")
        if hemoglobin_status and hemoglobin_status.status == "consistently_low":
            findings.append("Repeated low hemoglobin may reflect an anemia pattern and deserves clinical review.")
            risk_level = self._max_risk(risk_level, "medium")

        wbc_status = trends.get("white_blood_cells")
        if wbc_status and wbc_status.status == "consistently_high":
            findings.append("Persistently elevated white blood cells can be associated with ongoing inflammation or infection response.")
            risk_level = self._max_risk(risk_level, "medium")

        vitamin_b12_status = trends.get("vitamin_b12")
        if vitamin_b12_status and vitamin_b12_status.status == "consistently_low":
            findings.append("Vitamin B12 has remained low over time, which may suggest an ongoing deficiency pattern.")

        vitamin_d_status = trends.get("vitamin_d")
        if vitamin_d_status and vitamin_d_status.status == "consistently_low":
            findings.append("Vitamin D has remained low over time, which may suggest a persistent deficiency pattern.")

        platelet_status = trends.get("platelets")
        if platelet_status and platelet_status.trend == "increasing" and platelet_status.status == "improving":
            findings.append("Platelet values have improved over time and moved toward a more reassuring range.")

        if not findings:
            findings.append("No high-risk multi-report trend was detected from the available structured data.")

        return findings, risk_level

    async def generate_summary(
        self,
        patient_id: UUID,
        trends: dict[str, ParameterTrend],
        findings: list[str],
        risk_level: str,
    ) -> AIInsightPayload:
        payload = {
            name: {
                "values": [{"date": point.date, "value": point.value, "unit": point.unit} for point in trend.values],
                "trend": trend.trend,
                "status": trend.status,
            }
            for name, trend in trends.items()
        }
        prompt = (
            "Analyze the following patient lab trends over time. "
            "Be medically cautious, non-diagnostic, and use only the provided structured data. "
            "Return JSON with key_findings, risk_level, and summary.\n\n"
            f"patient_id: {patient_id}\n"
            f"trends: {payload}\n"
            f"deterministic_findings: {findings}\n"
            f"deterministic_risk_level: {risk_level}"
        )
        try:
            response = await self.ai_client.responses.parse(
                model=settings.openai_model,
                input=[
                    {"role": "system", "content": "You summarize multi-report lab trends cautiously for clinicians and patients. Return strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
                text_format=AIInsightPayload,
            )
            return response.output_parsed or AIInsightPayload(key_findings=findings, risk_level=risk_level, summary=findings[:3])
        except Exception:
            return AIInsightPayload(key_findings=findings, risk_level=risk_level, summary=findings[:3])

    async def _get_patient(self, patient_id: UUID) -> Patient:
        patient = await self.db.get(Patient, patient_id)
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient

    async def _list_patient_reports(self, patient_id: UUID) -> list[Report]:
        statement = (
            select(Report)
            .where(Report.patient_id == patient_id)
            .options(selectinload(Report.extracted_data))
            .order_by(Report.created_at.asc())
        )
        return list((await self.db.scalars(statement)).all())

    async def _ensure_access(self, patient: Patient, current_user: User) -> None:
        if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
            raise NotFoundError("Patient profile not found.")
        if current_user.role == UserRole.DOCTOR:
            doctor = (await self.db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
            has_case = (
                await self.db.scalars(select(Case.id).where(Case.patient_id == patient.id, Case.doctor_id == doctor.id))
            ).first() if doctor else None
            if not has_case:
                raise NotFoundError("Patient insights are not available for this doctor.")

    def _classify_trend(self, values: list[float]) -> str:
        if len(values) < 2:
            return "stable"
        first = values[0]
        last = values[-1]
        if first == 0:
            return "stable"
        delta_ratio = (last - first) / abs(first)
        if delta_ratio > 0.05:
            return "increasing"
        if delta_ratio < -0.05:
            return "decreasing"
        return "stable"

    def _classify_status(self, parameter: str, values: list[float]) -> str:
        reference = DEFAULT_REFERENCE_HINTS.get(parameter)
        if not reference:
            return "within_observed_range"

        low = reference.get("low")
        high = reference.get("high")
        all_low = low is not None and all(value < low for value in values)
        all_high = high is not None and all(value > high for value in values)
        latest = values[-1]
        earliest = values[0]
        latest_normal = (low is None or latest >= low) and (high is None or latest <= high)
        earliest_low = low is not None and earliest < low
        earliest_high = high is not None and earliest > high

        if all_low:
            if len(values) >= 2 and latest > earliest:
                return "improving"
            return "consistently_low"
        if all_high:
            return "consistently_high"
        if len(values) >= 2 and latest_normal and ((earliest_low and latest > earliest) or (earliest_high and latest < earliest)):
            return "improving"
        if len(values) >= 2 and earliest != 0 and abs((latest - earliest) / abs(earliest)) > 0.25:
            return "sudden_change"
        return "within_observed_range"

    def _max_risk(self, left: str, right: str) -> str:
        order = {"low": 0, "medium": 1, "high": 2}
        return left if order[left] >= order[right] else right
