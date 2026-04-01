from collections import defaultdict
from datetime import UTC, date, datetime, time
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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


class InsightsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_patient_insights(self, patient_id: UUID, current_user: User) -> PatientInsightsResponse:
        patient = await self._get_patient(patient_id)
        await self._ensure_access(patient, current_user)
        reports = await self._list_patient_reports(patient.id)
        aggregated = self.aggregate_parameters(reports)
        trends = self.generate_trends(aggregated)
        findings, risk_level = self.detect_abnormal_patterns(trends)
        stored_findings = self.collect_stored_findings(reports)
        summary = self.build_summary(trends, findings, stored_findings)
        key_findings = self._dedupe([*stored_findings, *findings])[:8]

        if not key_findings:
            key_findings = ["No high-risk multi-report pattern was detected from the stored report data."]

        return PatientInsightsResponse(
            patient_id=patient.id,
            trends=trends,
            key_findings=key_findings,
            risk_level=self._derive_risk_level(risk_level, stored_findings),
            summary=summary,
        )

    def aggregate_parameters(self, reports: list[Report]) -> dict[str, list[ParameterPoint]]:
        parameter_index: dict[str, list[ParameterPoint]] = defaultdict(list)
        for report in sorted(reports, key=self._report_sort_key):
            report_date = (
                report.report_date.isoformat()
                if report.report_date
                else report.created_at.date().isoformat()
            )
            for raw_name, payload in self._iter_report_parameters(report):
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
            trends[parameter] = ParameterTrend(
                values=ordered,
                trend=trend,
                status=status,
                latest_unit=ordered[-1].unit if ordered else None,
            )
        return trends

    def detect_abnormal_patterns(self, trends: dict[str, ParameterTrend]) -> tuple[list[str], str]:
        findings: list[str] = []
        risk_level = "low"

        for parameter, trend_data in trends.items():
            values = [point.value for point in trend_data.values]
            if not values:
                continue
            status = trend_data.status
            label = self._label(parameter)

            if status == "consistently_low":
                findings.append(f"{label} has remained below the expected range across multiple reports.")
                risk_level = self._max_risk(risk_level, "medium")
            elif status == "consistently_high":
                findings.append(f"{label} has remained above the expected range across multiple reports.")
                risk_level = self._max_risk(risk_level, "medium")
            elif status == "sudden_change":
                findings.append(f"{label} shows a sudden shift between reports and may need closer clinical review.")
                risk_level = self._max_risk(risk_level, "medium")
            elif status == "improving":
                findings.append(f"{label} is moving toward a more reassuring range over time.")

            if self._is_critical_value(parameter, values[-1]):
                findings.append(f"{label} is at a critically abnormal level in the latest stored report.")
                risk_level = self._max_risk(risk_level, "high")

        return self._dedupe(findings), risk_level

    def collect_stored_findings(self, reports: list[Report]) -> list[str]:
        findings: list[str] = []
        for report in sorted(reports, key=self._report_sort_key, reverse=True):
            for insight in report.insights:
                text = insight.description or insight.title
                if text:
                    findings.append(text.strip())
            if report.summary:
                findings.append(report.summary.strip())
        return self._dedupe(findings)[:10]

    def build_summary(
        self,
        trends: dict[str, ParameterTrend],
        findings: list[str],
        stored_findings: list[str],
    ) -> list[str]:
        summary: list[str] = []
        summary.extend(stored_findings[:3])

        for parameter in ("hemoglobin", "platelets", "vitamin_b12", "vitamin_d", "white_blood_cells"):
            trend_data = trends.get(parameter)
            if not trend_data or not trend_data.values:
                continue
            label = self._label(parameter)
            latest = trend_data.values[-1]
            if trend_data.status in {"consistently_low", "consistently_high", "sudden_change"}:
                summary.append(
                    f"{label} is {trend_data.status.replace('_', ' ')} in the stored trend history "
                    f"(latest {latest.value:g} {latest.unit or ''}).".strip()
                )
            elif trend_data.trend == "stable":
                summary.append(f"{label} remains stable across the stored reports.")
            else:
                summary.append(f"{label} shows a {trend_data.trend} trend across the stored reports.")

        if not summary:
            summary = findings[:3]
        if not summary:
            summary = ["Stored report data does not show a high-risk multi-report pattern right now."]
        return self._dedupe(summary)[:6]

    async def _get_patient(self, patient_id: UUID) -> Patient:
        patient = await self.db.get(Patient, patient_id)
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient

    async def _list_patient_reports(self, patient_id: UUID) -> list[Report]:
        statement = (
            select(Report)
            .where(Report.patient_id == patient_id)
            .options(selectinload(Report.extracted_data), selectinload(Report.insights))
            .order_by(Report.report_date.asc(), Report.created_at.asc())
        )
        return list((await self.db.scalars(statement)).all())

    async def _ensure_access(self, patient: Patient, current_user: User) -> None:
        if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
            raise NotFoundError("Patient profile not found.")
        if current_user.role == UserRole.DOCTOR:
            doctor = (
                await self.db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
            ).scalar_one_or_none()
            has_case = (
                await self.db.scalars(
                    select(Case.id).where(Case.patient_id == patient.id, Case.doctor_id == doctor.id)
                )
            ).first() if doctor else None
            if not has_case:
                raise NotFoundError("Patient insights are not available for this doctor.")

    def _iter_report_parameters(self, report: Report) -> list[tuple[str, dict]]:
        if report.parameters:
            pairs: list[tuple[str, dict]] = []
            for item in report.parameters:
                if not isinstance(item, dict):
                    continue
                name = item.get("name")
                if not name:
                    continue
                pairs.append((name, item))
            if pairs:
                return pairs

        key_values = report.extracted_data.key_values if report.extracted_data and report.extracted_data.key_values else {}
        return [
            (str(raw_name), payload)
            for raw_name, payload in key_values.items()
            if isinstance(payload, dict)
        ]

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

    def _is_critical_value(self, parameter: str, value: float) -> bool:
        if parameter == "platelets":
            return value < 100000 or value > 600000
        if parameter == "hemoglobin":
            return value < 9 or value > 19
        if parameter == "vitamin_b12":
            return value < 150
        if parameter == "vitamin_d":
            return value < 10
        return False

    def _derive_risk_level(self, base_risk_level: str, findings: list[str]) -> str:
        lowered = " ".join(findings).lower()
        if any(keyword in lowered for keyword in ("critical", "severe", "markedly", "urgent")):
            return self._max_risk(base_risk_level, "high")
        if any(keyword in lowered for keyword in ("deficiency", "abnormal", "drop", "elevated")):
            return self._max_risk(base_risk_level, "medium")
        return base_risk_level

    def _label(self, name: str) -> str:
        return name.replace("_", " ").capitalize()

    def _max_risk(self, left: str, right: str) -> str:
        order = {"low": 0, "medium": 1, "high": 2}
        return left if order[left] >= order[right] else right

    def _dedupe(self, items: list[str]) -> list[str]:
        unique: list[str] = []
        seen: set[str] = set()
        for item in items:
            normalized = " ".join((item or "").split())
            if not normalized:
                continue
            signature = normalized.lower()
            if signature in seen:
                continue
            seen.add(signature)
            unique.append(normalized)
        return unique

    def _report_sort_key(self, report: Report) -> datetime:
        if report.report_date:
            return datetime.combine(report.report_date, time.min, tzinfo=UTC)
        created_at = report.created_at
        if created_at.tzinfo is None:
            return created_at.replace(tzinfo=UTC)
        return created_at.astimezone(UTC)
