from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID
from xml.sax.saxutils import escape

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.patient import Patient
from app.models.report import Report
from app.schemas.insights import PatientInsightsResponse
from app.schemas.trends import PatientTrendsResponse, TrendValuePoint
from app.services.insights.service import InsightsService
from app.services.insights.trends import TrendService

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    REPORTLAB_AVAILABLE = True
    REPORTLAB_IMPORT_ERROR: Exception | None = None
except ModuleNotFoundError as exc:  # pragma: no cover - depends on local env
    REPORTLAB_AVAILABLE = False
    REPORTLAB_IMPORT_ERROR = exc


PRIORITY_PARAMETERS = [
    "hemoglobin",
    "platelets",
    "vitamin_b12",
    "vitamin_d",
    "white_blood_cells",
    "iron",
]

ABNORMAL_STATUSES = {"low", "high", "deficient", "insufficient", "critical"}
THEME = {
    "background": "#0A0F1C",
    "surface": "#11192B",
    "surface_soft": "#0F1728",
    "line": "#1E293B",
    "text": "#F8FAFC",
    "muted": "#AFC0D7",
    "accent": "#38BDF8",
    "accent_soft": "#14263D",
    "cyan": "#67E8F9",
    "red": "#F87171",
    "yellow": "#FBBF24",
    "green": "#34D399",
}
DEFAULT_NORMAL_RANGES = {
    "hemoglobin": "12.0-17.5 g/dL",
    "platelets": "150000-450000 /uL",
    "vitamin_b12": "200-900 pg/mL",
    "vitamin_d": "20-100 ng/mL",
    "white_blood_cells": "4.0-11.0 x10^3/uL",
    "iron": "60-170 ug/dL",
}


def _sanitize(value: Any) -> str:
    text = str(value or "").strip()
    replacements = {
        "Âµ": "u",
        "Ã—": "x",
        "â€“": "-",
        "â€”": "-",
        "â€¢": "-",
        "â†‘": "up",
        "â†“": "down",
        "â†’": "stable",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return " ".join(text.split())


def _labelize(value: str | None) -> str:
    if not value:
        return "Unknown"
    return str(value).replace("_", " ").title()


def _format_number(value: Any) -> str:
    if not isinstance(value, (int, float)):
        return "-"
    numeric = float(value)
    if numeric.is_integer():
        return str(int(numeric))
    return f"{numeric:.2f}".rstrip("0").rstrip(".")


def _format_value_unit(value: Any, unit: str | None = None) -> str:
    unit_text = _sanitize(unit)
    base = _format_number(value)
    return f"{base} {unit_text}".strip()


def _clean_sentence(text: Any) -> str:
    sentence = _sanitize(text)
    if not sentence:
        return ""
    sentence = sentence[0].upper() + sentence[1:] if len(sentence) > 1 else sentence.upper()
    if sentence[-1] not in ".!?":
        sentence += "."
    return sentence


def _is_abnormal_status(status: str | None) -> bool:
    return str(status or "").lower() in ABNORMAL_STATUSES


def _severity_color_label(status: str | None, *, persistent: bool = False, extreme: bool = False) -> str:
    normalized = str(status or "").lower()
    if extreme or normalized in {"critical", "deficient"}:
        return "Critical / Red"
    if persistent or normalized in {"high", "low"}:
        return "High / Amber"
    if normalized == "insufficient":
        return "Moderate / Yellow"
    return "Normal / Green"


def _severity_color(value: str):
    if not REPORTLAB_AVAILABLE:
        return None
    if value == "Critical / Red":
        return colors.HexColor(THEME["red"])
    if value == "High / Amber":
        return colors.HexColor(THEME["yellow"])
    if value == "Moderate / Yellow":
        return colors.HexColor("#FCD34D")
    return colors.HexColor(THEME["green"])


def _metric_pill_status(score: int) -> str:
    if score < 60:
        return "CRITICAL RISK"
    if score < 90:
        return "MODERATE RISK"
    return "GOOD"


class PatientPdfExportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def generate_patient_report_pdf(self, patient_id: UUID) -> tuple[bytes, str]:
        self._ensure_reportlab()
        patient = await self._get_patient(patient_id)
        reports = await self._get_reports(patient.id)
        trends = await TrendService(self.db).build_trends(patient.id)
        insights = await InsightsService(self.db).get_patient_insights(patient.id, patient.user)
        pdf_bytes = self._build_pdf(patient, reports, trends, insights)
        filename = f"health_report_{datetime.now(UTC).date().isoformat()}.pdf"
        return pdf_bytes, filename

    def _ensure_reportlab(self) -> None:
        if REPORTLAB_AVAILABLE:
            return
        raise RuntimeError(
            "reportlab is required for PDF export. Install backend dependencies from requirements.txt."
        ) from REPORTLAB_IMPORT_ERROR

    async def _get_patient(self, patient_id: UUID) -> Patient:
        statement = select(Patient).where(Patient.id == patient_id).options(selectinload(Patient.user))
        patient = (await self.db.execute(statement)).scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile not found.")
        return patient

    async def _get_reports(self, patient_id: UUID) -> list[Report]:
        statement = (
            select(Report)
            .where(Report.patient_id == patient_id)
            .options(selectinload(Report.insights))
            .order_by(Report.report_date.asc(), Report.created_at.asc())
        )
        return list((await self.db.scalars(statement)).all())

    def _build_pdf(
        self,
        patient: Patient,
        reports: list[Report],
        trends: PatientTrendsResponse,
        insights: PatientInsightsResponse,
    ) -> bytes:
        styles = self._build_styles()
        generated_on = datetime.now(UTC).strftime("%d %b %Y")
        timeline_range = self._timeline_range(reports)
        latest_report = self._latest_report(reports)
        latest_parameters = self._latest_parameter_map(reports)
        health_score = self._calculate_health_score(latest_parameters, trends, insights)
        critical_findings = self._build_critical_findings(latest_parameters, trends)
        quick_stats = self._build_quick_stats(reports, latest_parameters, trends)
        parameter_rows = self._build_parameter_rows(latest_parameters, trends, styles)
        trend_rows = self._build_trend_rows(trends, latest_parameters, styles)
        trend_snapshot_rows = self._build_trend_snapshot_rows(trends, styles)
        insight_rows = self._build_clinical_insight_rows(insights, trends, latest_parameters)
        recommendations = self._build_recommendations(latest_parameters, trends, reports)
        anomaly_groups = self._group_anomalies_by_severity(trends)
        visit_entries = self._build_visit_entries(reports)
        final_summary = self._build_final_summary(health_score, critical_findings, insights, trends)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=16 * mm,
            title="DoctorCopilot AI Clinical Decision Support Report",
            author="DoctorCopilot",
        )

        story = [
            self._header_block(styles, "DoctorCopilot", "AI Clinical Decision Support Report"),
            Spacer(1, 10),
            *self._section_panel(
                "Patient Identity",
                [
                    self._info_grid(
                        [
                            ("Patient Name", patient.user.full_name),
                            ("Age / Gender", f"{patient.age or 'Unknown'} / {patient.gender or 'Unknown'}"),
                            ("Blood Group", patient.blood_group or "Unknown"),
                            ("Generated", generated_on),
                            ("Reports", str(len(reports))),
                            ("Timeline", timeline_range),
                        ],
                        styles,
                    )
                ],
                styles,
            ),
            Spacer(1, 12),
            *self._section_panel("Health Score", [self._health_score_block(health_score, styles)], styles),
            Spacer(1, 12),
            *self._section_panel(
                "Critical Findings",
                self._paragraph_list(
                    critical_findings
                    or ["No high-priority abnormal findings were identified in the latest structured report."],
                    styles,
                ),
                styles,
            ),
            Spacer(1, 12),
            *self._section_panel("Quick Stats", [self._quick_stats_table(quick_stats, styles)], styles),
            PageBreak(),
            self._header_block(
                styles,
                "Clinical Data",
                latest_report.report_type if latest_report else "Patient report history",
            ),
            Spacer(1, 10),
            *self._section_panel(
                "Parameter Table",
                [self._data_table(["Parameter", "Value", "Range", "Status", "Severity"], parameter_rows, [84, 76, 104, 68, 102], styles)],
                styles,
            ),
            Spacer(1, 12),
            *self._section_panel(
                "Trend Analysis",
                [self._data_table(["Parameter", "Trend", "Change", "Clinical Interpretation"], trend_rows, [82, 72, 62, 218], styles)],
                styles,
            ),
            Spacer(1, 12),
            *self._section_panel(
                "Trend Snapshot",
                [self._data_table(["Parameter", "Recent Direction"], trend_snapshot_rows, [94, 340], styles)],
                styles,
            ),
            PageBreak(),
            self._header_block(styles, "AI Interpretation", "Clinically phrased AI support summary"),
            Spacer(1, 10),
            *self._section_panel("AI Insights", self._paragraph_list(insight_rows, styles), styles),
            Spacer(1, 12),
            *self._section_panel("Recommendations", self._paragraph_list(recommendations, styles), styles),
            Spacer(1, 12),
            *self._section_panel("Anomaly Detection", self._anomaly_group_block(anomaly_groups, styles), styles),
            Spacer(1, 12),
            *self._section_panel("Clinical Summary", [Paragraph(escape(final_summary), styles["Body"])], styles),
            PageBreak(),
            self._header_block(styles, "Visit Timeline", "Chronological care context across available reports"),
            Spacer(1, 10),
            *self._section_panel("Visit History", self._visit_timeline_block(visit_entries, styles), styles),
        ]

        doc.build(story, onFirstPage=self._decorate_page, onLaterPages=self._decorate_page)
        return buffer.getvalue()

    def _build_styles(self):
        base = getSampleStyleSheet()
        return {
            "Title": ParagraphStyle(
                "Title",
                parent=base["Heading1"],
                fontName="Helvetica-Bold",
                fontSize=24,
                leading=28,
                textColor=colors.HexColor(THEME["text"]),
                spaceAfter=2,
            ),
            "Subtitle": ParagraphStyle(
                "Subtitle",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=10,
                leading=14,
                textColor=colors.HexColor(THEME["muted"]),
            ),
            "Section": ParagraphStyle(
                "Section",
                parent=base["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=13,
                leading=16,
                textColor=colors.HexColor(THEME["text"]),
                spaceAfter=8,
            ),
            "Label": ParagraphStyle(
                "Label",
                parent=base["BodyText"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor(THEME["muted"]),
                uppercase=True,
            ),
            "Value": ParagraphStyle(
                "Value",
                parent=base["BodyText"],
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=15,
                textColor=colors.HexColor(THEME["text"]),
            ),
            "Body": ParagraphStyle(
                "Body",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=10,
                leading=15,
                textColor=colors.HexColor(THEME["muted"]),
            ),
            "BodyStrong": ParagraphStyle(
                "BodyStrong",
                parent=base["BodyText"],
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=15,
                textColor=colors.HexColor(THEME["text"]),
            ),
            "Tiny": ParagraphStyle(
                "Tiny",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor(THEME["muted"]),
            ),
        }

    def _decorate_page(self, canvas, doc) -> None:  # pragma: no cover - visual rendering
        canvas.saveState()
        canvas.setFillColor(colors.HexColor(THEME["background"]))
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor(THEME["muted"]))
        canvas.setFont("Helvetica", 8)
        canvas.drawString(doc.leftMargin, 10 * mm, "DoctorCopilot AI Clinical Decision Support Report")
        canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    def _header_block(self, styles, eyebrow: str, title: str):
        return KeepTogether(
            [
                Paragraph(f"<font color='{THEME['cyan']}'>{escape(eyebrow.upper())}</font>", styles["Label"]),
                Spacer(1, 4),
                Paragraph(escape(title), styles["Title"]),
            ]
        )

    def _section_panel(self, title: str, content: list[Any], styles):
        divider = Table([[""]], colWidths=[170 * mm], rowHeights=[1.2 * mm])
        divider.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(THEME["accent_soft"])),
                    ("BOX", (0, 0), (-1, -1), 0, colors.HexColor(THEME["accent_soft"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return [Paragraph(escape(title), styles["Section"]), Spacer(1, 4), divider, Spacer(1, 8), *content]

    def _info_grid(self, pairs: list[tuple[str, str]], styles):
        rows: list[list[Any]] = []
        for index in range(0, len(pairs), 2):
            current = []
            for label, value in pairs[index : index + 2]:
                current.append(
                    Paragraph(
                        f"<font color='{THEME['muted']}'>{escape(label.upper())}</font><br/>{escape(_sanitize(value))}",
                        styles["Value"],
                    )
                )
            if len(current) == 1:
                current.append("")
            rows.append(current)
        table = Table(rows, colWidths=[82 * mm, 82 * mm], hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(THEME["surface_soft"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor(THEME["line"])),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor(THEME["line"])),
                ]
            )
        )
        return table

    def _health_score_block(self, health_score: dict[str, Any], styles):
        score = health_score["score"]
        status_text = _metric_pill_status(score)
        fill_width = max(1, min(140, round(140 * score / 100)))
        empty_width = 140 - fill_width
        bar_color = THEME["green"] if score >= 90 else THEME["yellow"] if score >= 60 else THEME["red"]
        bar = Table([["", ""]], colWidths=[fill_width * mm / 1.5, max(empty_width, 1) * mm / 1.5], rowHeights=[7 * mm])
        bar.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor(bar_color)),
                    ("BACKGROUND", (1, 0), (1, 0), colors.HexColor(THEME["accent_soft"])),
                    ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor(THEME["line"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        return KeepTogether(
            [
                Paragraph(
                    f"<font color='{THEME['muted']}'>SYSTEM INTEGRITY</font><br/><font size='22'>{score}/100</font>",
                    styles["BodyStrong"],
                ),
                Spacer(1, 6),
                bar,
                Spacer(1, 6),
                Paragraph(f"<font color='{bar_color}'>{escape(status_text)}</font>", styles["BodyStrong"]),
                Spacer(1, 6),
                Paragraph(escape(_sanitize(health_score["explanation"])), styles["Body"]),
                Spacer(1, 6),
                *[Paragraph(f"&bull; {escape(_sanitize(driver))}", styles["Body"]) for driver in health_score["drivers"][:3]],
            ]
        )

    def _quick_stats_table(self, stats: list[tuple[str, str]], styles):
        cells = []
        for label, value in stats:
            cells.append(
                Paragraph(
                    f"<font color='{THEME['muted']}'>{escape(label.upper())}</font><br/>{escape(_sanitize(value))}",
                    styles["Value"],
                )
            )
        table = Table([cells], colWidths=[41 * mm, 41 * mm, 41 * mm, 41 * mm], hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(THEME["surface_soft"])),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor(THEME["line"])),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor(THEME["line"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        return table

    def _data_table(self, headers: list[str], rows: list[list[Any]], col_widths: list[float], styles):
        header_cells = [Paragraph(f"<b>{escape(_sanitize(cell))}</b>", styles["Tiny"]) for cell in headers]
        normalized_rows = [header_cells]
        for row in rows or [["No data available."] + [""] * (len(headers) - 1)]:
            normalized_rows.append(row)
        table = Table(normalized_rows, colWidths=[width * mm / 1.55 for width in col_widths], repeatRows=1, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(THEME["accent_soft"])),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor(THEME["text"])),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor(THEME["line"])),
                    ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor(THEME["line"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor(THEME["surface_soft"])),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        return table

    def _paragraph_list(self, items: list[str], styles) -> list[Any]:
        return [Paragraph(f"&bull; {escape(_sanitize(item))}", styles["Body"]) for item in items]

    def _anomaly_group_block(self, groups: dict[str, list[str]], styles) -> list[Any]:
        flow: list[Any] = []
        has_any = False
        for severity in ("Critical", "Warning"):
            items = groups.get(severity, [])
            if not items:
                continue
            has_any = True
            color_value = THEME["red"] if severity == "Critical" else THEME["yellow"]
            flow.append(Paragraph(f"<font color='{color_value}'><b>{severity.upper()}</b></font>", styles["BodyStrong"]))
            flow.append(Spacer(1, 4))
            flow.extend(self._paragraph_list(items, styles))
            flow.append(Spacer(1, 6))
        if not has_any:
            flow.append(Paragraph("No persistent, sudden, or critical-value anomalies are currently detected.", styles["Body"]))
        return flow

    def _visit_timeline_block(self, entries: list[dict[str, str]], styles) -> list[Any]:
        flow: list[Any] = []
        if not entries:
            return [Paragraph("No historical visit context is currently available.", styles["Body"])]
        for entry in entries:
            flow.append(Paragraph(f"<font color='{THEME['cyan']}'><b>{escape(entry['title'])}</b></font>", styles["BodyStrong"]))
            flow.append(Spacer(1, 2))
            flow.append(Paragraph(escape(entry["body"]), styles["Body"]))
            flow.append(Spacer(1, 10))
        return flow

    def _timeline_range(self, reports: list[Report]) -> str:
        dates = [report.report_date or report.created_at.date() for report in reports if report.report_date or report.created_at]
        if not dates:
            return "No report dates available"
        return f"{min(dates).year}-{max(dates).year}"

    def _latest_report(self, reports: list[Report]) -> Report | None:
        if not reports:
            return None
        return sorted(
            reports,
            key=lambda report: report.report_date or (report.created_at.date() if report.created_at else datetime.min.date()),
            reverse=True,
        )[0]

    def _latest_parameter_map(self, reports: list[Report]) -> dict[str, dict[str, Any]]:
        latest: dict[str, dict[str, Any]] = {}
        sorted_reports = sorted(
            reports,
            key=lambda report: report.report_date or (report.created_at.date() if report.created_at else datetime.min.date()),
            reverse=True,
        )
        for report in sorted_reports:
            for parameter in report.parameters or []:
                name = parameter.get("name")
                value = parameter.get("value")
                if not name or not isinstance(value, (float, int)):
                    continue
                latest.setdefault(name, parameter)
        return latest

    def _ordered_parameter_names(self, latest_parameters: dict[str, dict[str, Any]]) -> list[str]:
        ordered = [name for name in PRIORITY_PARAMETERS if name in latest_parameters]
        remainder = sorted(name for name in latest_parameters if name not in ordered)
        return ordered + remainder

    def _persistent_abnormality(self, name: str, trends: PatientTrendsResponse) -> bool:
        history = trends.series.get(name, [])
        abnormal_points = [point for point in history if _is_abnormal_status(point.status)]
        return len(abnormal_points) >= 2

    def _severity_for_parameter(self, name: str, parameter: dict[str, Any], trends: PatientTrendsResponse) -> str:
        status = str(parameter.get("status") or parameter.get("interpretation") or "unknown")
        extreme = any(item.get("parameter") == name and item.get("severity") == "critical" for item in trends.anomalies)
        return _severity_color_label(status, persistent=self._persistent_abnormality(name, trends), extreme=extreme)

    def _clinicalize_insight_text(self, text: Any) -> str:
        sentence = _sanitize(text).lower()
        replacements = [
            (" remains consistently low", " remains persistently low across serial reports"),
            (" remains consistently high", " remains persistently high across serial reports"),
            (" stable within the normal range", " has remained stable within the expected reference interval"),
            (" improved from ", " demonstrated recovery from "),
            (" declined from ", " declined clinically from "),
            (" low in 3 consecutive reports", " remains low across three consecutive reports"),
            (" overall blood profile improving over time", " the overall blood profile shows interval improvement"),
        ]
        for source, target in replacements:
            sentence = sentence.replace(source, target)
        return _clean_sentence(sentence)

    def _calculate_health_score(
        self,
        latest_parameters: dict[str, dict[str, Any]],
        trends: PatientTrendsResponse,
        insights: PatientInsightsResponse,
    ) -> dict[str, Any]:
        score = 97
        drivers: list[str] = []
        for name in self._ordered_parameter_names(latest_parameters):
            parameter = latest_parameters[name]
            status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
            if not _is_abnormal_status(status):
                continue
            score -= 8 if status in {"low", "high"} else 11
            drivers.append(f"{_labelize(name)} is currently {status}.")
            if self._persistent_abnormality(name, trends):
                score -= 6
                drivers.append(f"{_labelize(name)} has remained abnormal across multiple reports.")
            metric = trends.metrics.get(name)
            if metric and metric.direction == "decreasing" and status != "high":
                score -= 4
                drivers.append(f"{_labelize(name)} is trending downward.")
        findings = [*(insights.key_findings or []), *(trends.summary or [])]
        score -= min(len(findings) * 2, 10)
        score = max(32, min(99, round(score)))
        status = "Normal"
        explanation = "Current longitudinal markers are largely within expected limits."
        if score < 60:
            status = "Critical"
            explanation = "Multiple abnormal or persistent issues require closer clinical attention."
        elif score < 90:
            status = "Risk"
            explanation = "Several markers warrant ongoing monitoring due to recent abnormalities or trend deterioration."
        if not drivers:
            drivers.append("Most recent structured markers are stable without major persistent abnormalities.")
        return {"score": score, "status": status, "explanation": explanation, "drivers": list(dict.fromkeys(drivers))[:4]}

    def _build_critical_findings(self, latest_parameters: dict[str, dict[str, Any]], trends: PatientTrendsResponse) -> list[str]:
        findings: list[tuple[int, str]] = []
        severity_rank = {"Critical / Red": 3, "High / Amber": 2, "Moderate / Yellow": 1, "Normal / Green": 0}
        for name in self._ordered_parameter_names(latest_parameters):
            parameter = latest_parameters[name]
            status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
            if not _is_abnormal_status(status):
                continue
            severity = self._severity_for_parameter(name, parameter, trends)
            persistent = self._persistent_abnormality(name, trends)
            value_text = _format_value_unit(parameter.get("value"), parameter.get("unit"))
            if name == "vitamin_b12" and status in {"low", "deficient"}:
                message = f"Vitamin B12 remains deficient at {value_text}, consistent with a deficiency pattern."
            elif name == "platelets" and status == "low":
                message = f"Platelet count is low at {value_text}, compatible with a thrombocytopenic trend."
            elif name == "vitamin_d" and status in {"deficient", "insufficient"}:
                message = f"Vitamin D is {status} at {value_text}, indicating inadequate vitamin status."
            else:
                message = f"{_labelize(name)} is {status} at {value_text}."
            if persistent:
                message += " This abnormality has persisted across serial reports."
            findings.append((severity_rank.get(severity, 0), _clean_sentence(message)))
        findings.sort(key=lambda item: item[0], reverse=True)
        return [message for _, message in findings[:5]]

    def _build_quick_stats(
        self,
        reports: list[Report],
        latest_parameters: dict[str, dict[str, Any]],
        trends: PatientTrendsResponse,
    ) -> list[tuple[str, str]]:
        latest_report = self._latest_report(reports)
        abnormal_count = sum(1 for parameter in latest_parameters.values() if _is_abnormal_status(parameter.get("status")))
        return [
            ("Reports", str(len(reports))),
            ("Abnormal Markers", str(abnormal_count)),
            ("Active Anomalies", str(len(trends.anomalies))),
            ("Latest Lab", latest_report.lab_name if latest_report and latest_report.lab_name else "Unknown"),
        ]

    def _normal_range_for_parameter(self, name: str, parameter: dict[str, Any]) -> str:
        reference = parameter.get("reference_range")
        if reference:
            return _sanitize(reference)
        parsed = parameter.get("reference_range_parsed") or {}
        if parsed.get("min") is not None and parsed.get("max") is not None:
            return f"{parsed['min']}-{parsed['max']}"
        return DEFAULT_NORMAL_RANGES.get(name, "-")

    def _severity_paragraph(self, value: str, styles):
        color_value = _severity_color(value)
        color_hex = color_value.hexval() if color_value else THEME["text"]
        return Paragraph(f"<font color='{color_hex}'>{escape(value)}</font>", styles["BodyStrong"])

    def _build_parameter_rows(self, latest_parameters: dict[str, dict[str, Any]], trends: PatientTrendsResponse, styles) -> list[list[Any]]:
        rows: list[list[Any]] = []
        for name in self._ordered_parameter_names(latest_parameters):
            parameter = latest_parameters[name]
            severity = self._severity_for_parameter(name, parameter, trends)
            rows.append(
                [
                    Paragraph(escape(_labelize(name)), styles["Body"]),
                    Paragraph(escape(_format_value_unit(parameter.get("value"), parameter.get("unit"))), styles["Body"]),
                    Paragraph(escape(self._normal_range_for_parameter(name, parameter)), styles["Body"]),
                    Paragraph(escape(str(parameter.get("status") or parameter.get("interpretation") or "unknown").title()), styles["Body"]),
                    self._severity_paragraph(severity, styles),
                ]
            )
        return rows

    def _latest_status(self, series: list[TrendValuePoint], parameter: dict[str, Any] | None) -> str:
        if series and series[-1].status:
            return str(series[-1].status)
        if parameter:
            return str(parameter.get("status") or parameter.get("interpretation") or "unknown")
        return "unknown"

    def _clinical_trend_label(self, direction: str, status: str) -> str:
        status_lower = status.lower()
        if direction == "increasing" and status_lower in {"low", "deficient", "insufficient"}:
            return "Recovering"
        if direction == "decreasing" and status_lower in {"low", "deficient", "insufficient"}:
            return "Worsening"
        if direction == "increasing" and status_lower == "high":
            return "Rising High"
        if direction == "decreasing" and status_lower == "normal":
            return "Mild Decline"
        if direction == "stable":
            return "Stable"
        return direction.title()

    def _trend_interpretation(self, name: str, status: str, direction: str, stability: str | None) -> str:
        status_lower = status.lower()
        if direction == "increasing" and status_lower in {"low", "deficient", "insufficient"}:
            return "Shows recovery but remains clinically relevant because previous values were below range."
        if direction == "decreasing" and status_lower in {"low", "deficient", "insufficient"}:
            return "Continues to decline in the setting of an already abnormal low pattern."
        if direction == "decreasing" and status_lower == "normal":
            return "Trending downward but remains within the laboratory reference interval."
        if direction == "increasing" and status_lower == "high":
            return "Rising further above the expected laboratory range."
        if direction == "stable" and status_lower in {"normal", "sufficient"}:
            return "Stable within the expected laboratory range."
        if status_lower in {"high", "low", "deficient", "insufficient"}:
            return f"Currently {status_lower}, requiring interval follow-up."
        if stability == "volatile":
            return "Values fluctuate across reports and should be interpreted with caution."
        return f"{_labelize(name)} remains clinically stable across the observed interval."

    def _build_trend_rows(self, trends: PatientTrendsResponse, latest_parameters: dict[str, dict[str, Any]], styles) -> list[list[Any]]:
        rows: list[list[Any]] = []
        for name in [name for name in PRIORITY_PARAMETERS if name in trends.metrics]:
            metric = trends.metrics[name]
            latest_status = self._latest_status(trends.series.get(name, []), latest_parameters.get(name))
            rows.append(
                [
                    Paragraph(escape(_labelize(name)), styles["Body"]),
                    Paragraph(escape(self._clinical_trend_label(metric.direction, latest_status)), styles["Body"]),
                    Paragraph(escape(metric.change or "-"), styles["Body"]),
                    Paragraph(escape(self._trend_interpretation(name, latest_status, metric.direction, metric.stability)), styles["Body"]),
                ]
            )
        return rows

    def _build_trend_snapshot_rows(self, trends: PatientTrendsResponse, styles) -> list[list[Any]]:
        rows: list[list[Any]] = []
        for name in [name for name in PRIORITY_PARAMETERS if name in trends.series]:
            points = trends.series[name][-4:]
            if not points:
                continue
            segments = [f"{point.date}: {_format_number(point.value)}" for point in points]
            rows.append(
                [
                    Paragraph(escape(_labelize(name)), styles["Body"]),
                    Paragraph(escape(" -> ".join(segments)), styles["Body"]),
                ]
            )
        return rows or [[Paragraph("No trend data", styles["Body"]), Paragraph("No recent values available.", styles["Body"])]]

    def _build_clinical_insight_rows(
        self,
        insights: PatientInsightsResponse,
        trends: PatientTrendsResponse,
        latest_parameters: dict[str, dict[str, Any]],
    ) -> list[str]:
        items = [*(insights.key_findings or []), *(insights.summary or []), *(trends.summary or [])]
        cleaned = [self._clinicalize_insight_text(item) for item in items if item]
        cleaned = [item for item in cleaned if item]
        if not cleaned:
            for name in self._ordered_parameter_names(latest_parameters):
                parameter = latest_parameters[name]
                status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
                if _is_abnormal_status(status):
                    cleaned.append(_clean_sentence(f"{_labelize(name)} is {status} at {_format_value_unit(parameter.get('value'), parameter.get('unit'))}"))
        return list(dict.fromkeys(cleaned))[:6] or ["No high-priority clinical AI insight is currently available."]

    def _build_recommendations(
        self,
        latest_parameters: dict[str, dict[str, Any]],
        trends: PatientTrendsResponse,
        reports: list[Report],
    ) -> list[str]:
        recommendations: list[str] = []
        for name in self._ordered_parameter_names(latest_parameters):
            parameter = latest_parameters[name]
            status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
            if not _is_abnormal_status(status):
                continue
            if name == "vitamin_b12":
                recommendations.append("Discuss vitamin B12 deficiency with the treating clinician and review supplementation history or nutritional contributors.")
            elif name == "platelets":
                recommendations.append("Repeat platelet monitoring and correlate with bleeding symptoms or medication history if clinically indicated.")
            elif name == "vitamin_d":
                recommendations.append("Consider vitamin D replacement planning and follow-up testing through the treating clinician.")
            elif name == "iron":
                recommendations.append("Correlate iron abnormalities with complete iron studies before starting or continuing supplementation.")
            elif name == "hemoglobin":
                recommendations.append("Review hemoglobin change in the context of anemia symptoms, iron status, and interval trend behavior.")
        if len(reports) >= 2:
            recommendations.append("Continue serial comparison with future reports so persistent abnormalities and reversals can be interpreted longitudinally.")
        if trends.anomalies:
            recommendations.append("Prioritize clinician review of the highlighted anomalies, especially persistent abnormalities and sudden interval changes.")
        cleaned = [_clean_sentence(item) for item in recommendations if item]
        return list(dict.fromkeys(cleaned))[:5] or ["Continue routine follow-up and correlate these findings with the treating clinician if new symptoms arise."]

    def _group_anomalies_by_severity(self, trends: PatientTrendsResponse) -> dict[str, list[str]]:
        groups = {"Critical": [], "Warning": []}
        for anomaly in trends.anomalies:
            message = _clean_sentence(anomaly.get("message"))
            if not message:
                continue
            groups["Critical" if anomaly.get("severity") == "critical" else "Warning"].append(message)
        return {key: list(dict.fromkeys(value)) for key, value in groups.items()}

    def _build_visit_entries(self, reports: list[Report]) -> list[dict[str, str]]:
        entries: list[dict[str, str]] = []
        for report in reports:
            metadata = report.report_metadata or {}
            lab = metadata.get("lab") or {}
            doctor = metadata.get("doctor") or {}
            report_date = report.report_date.isoformat() if report.report_date else (report.created_at.date().isoformat() if report.created_at else "Unknown")
            lab_name = lab.get("lab_name") or report.lab_name or "Unknown lab"
            doctor_name = doctor.get("doctor_name") or report.doctor_name or "Unknown doctor"
            note = report.summary or (report.insights[0].description if report.insights else "Structured report available.")
            entries.append(
                {
                    "title": f"{report_date}  |  {lab_name}",
                    "body": _clean_sentence(f"Visit recorded through {lab_name} with clinician context {doctor_name}. {note}"),
                }
            )
        return entries

    def _build_final_summary(
        self,
        health_score: dict[str, Any],
        critical_findings: list[str],
        insights: PatientInsightsResponse,
        trends: PatientTrendsResponse,
    ) -> str:
        summary_parts = [health_score["explanation"].rstrip(".")]
        if critical_findings:
            summary_parts.append(critical_findings[0].rstrip("."))
        if insights.summary:
            summary_parts.append(_sanitize(insights.summary[0]).rstrip("."))
        elif trends.summary:
            summary_parts.append(_sanitize(trends.summary[0]).rstrip("."))
        joined = "; ".join(dict.fromkeys(part for part in summary_parts if part))
        return _clean_sentence(
            f"Overall interpretation: status is {health_score['status'].lower()} with a score of {health_score['score']} out of 100; {joined}. Continued physician review and interval monitoring are recommended."
        )


class SingleReportPdfExportService:
    def __init__(self) -> None:
        self._ensure_reportlab()

    def _ensure_reportlab(self) -> None:
        if REPORTLAB_AVAILABLE:
            return
        raise RuntimeError(
            "reportlab is required for PDF export. Install backend dependencies from requirements.txt."
        ) from REPORTLAB_IMPORT_ERROR

    def generate_report_pdf(self, report: Report, mode: str = "ai") -> tuple[bytes, str]:
        normalized_mode = (mode or "ai").strip().lower()
        if normalized_mode == "source" and report.mime_type == "application/pdf" and report.file_path:
            file_path = Path(report.file_path)
            if file_path.exists():
                return file_path.read_bytes(), self._filename(report, "source")

        if normalized_mode == "source":
            pdf_bytes = self._build_source_pdf(report)
        else:
            pdf_bytes = self._build_ai_pdf(report)
        return pdf_bytes, self._filename(report, normalized_mode)

    def _filename(self, report: Report, mode: str) -> str:
        stem = Path(report.file_name or f"report-{report.id}").stem
        safe_stem = "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in stem).strip("_") or "report"
        return f"{safe_stem}_{mode}.pdf"

    def _styles(self):
        base = getSampleStyleSheet()
        return {
            "Title": ParagraphStyle(
                "SingleReportTitle",
                parent=base["Heading1"],
                fontName="Helvetica-Bold",
                fontSize=22,
                leading=26,
                textColor=colors.HexColor(THEME["text"]),
                spaceAfter=4,
            ),
            "Section": ParagraphStyle(
                "SingleReportSection",
                parent=base["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=15,
                textColor=colors.HexColor(THEME["text"]),
                spaceAfter=6,
            ),
            "Body": ParagraphStyle(
                "SingleReportBody",
                parent=base["BodyText"],
                fontName="Helvetica",
                fontSize=10,
                leading=15,
                textColor=colors.HexColor(THEME["muted"]),
            ),
            "BodyStrong": ParagraphStyle(
                "SingleReportBodyStrong",
                parent=base["BodyText"],
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=15,
                textColor=colors.HexColor(THEME["text"]),
            ),
            "Label": ParagraphStyle(
                "SingleReportLabel",
                parent=base["BodyText"],
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor(THEME["muted"]),
            ),
        }

    def _build_ai_pdf(self, report: Report) -> bytes:
        styles = self._styles()
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=16 * mm,
            title=f"DoctorCopilot AI Report - {report.file_name}",
            author="DoctorCopilot",
        )
        interpretation = self._clinical_interpretation(report)
        findings = self._abnormal_findings(report)
        rows = self._parameter_rows(report, styles)
        story = [
            Paragraph("DoctorCopilot AI Report Summary", styles["Title"]),
            Paragraph(escape(_sanitize(report.file_name or "Clinical Report")), styles["Body"]),
            Spacer(1, 8),
            self._info_table(
                [
                    ("Patient", report.patient_name or "Unknown"),
                    ("Report Type", report.report_type or "Clinical Report"),
                    ("Lab", report.lab_name or "Unknown"),
                    ("Date", report.report_date.isoformat() if report.report_date else "Unknown"),
                ],
                styles,
            ),
            Spacer(1, 12),
            Paragraph("Critical Findings", styles["Section"]),
            *self._bullet_paragraphs(findings or ["No high-priority abnormal findings were extracted from this report."], styles),
            Spacer(1, 12),
            Paragraph("AI Summary", styles["Section"]),
            *self._bullet_paragraphs(interpretation or [report.summary or "Structured AI interpretation is not available."], styles),
            Spacer(1, 12),
            Paragraph("Structured Parameters", styles["Section"]),
            self._data_table(["Parameter", "Value", "Range", "Status"], rows, [90 * mm, 28 * mm, 38 * mm, 22 * mm], styles),
        ]
        doc.build(story, onFirstPage=self._decorate_page, onLaterPages=self._decorate_page)
        return buffer.getvalue()

    def _build_source_pdf(self, report: Report) -> bytes:
        styles = self._styles()
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=16 * mm,
            title=f"DoctorCopilot Source Report - {report.file_name}",
            author="DoctorCopilot",
        )
        raw_text = _sanitize(report.raw_text or "")
        story = [
            Paragraph("DoctorCopilot Source Report Copy", styles["Title"]),
            Paragraph(escape(_sanitize(report.file_name or "Clinical Report")), styles["Body"]),
            Spacer(1, 8),
            self._info_table(
                [
                    ("Patient", report.patient_name or "Unknown"),
                    ("Report Type", report.report_type or "Clinical Report"),
                    ("Lab", report.lab_name or "Unknown"),
                    ("Mime Type", report.mime_type or "Unknown"),
                    ("Date", report.report_date.isoformat() if report.report_date else "Unknown"),
                    ("Stored File", report.file_name or "Unknown"),
                ],
                styles,
            ),
            Spacer(1, 12),
            Paragraph("Extracted Raw Report Text", styles["Section"]),
            Paragraph(
                escape(raw_text or "No OCR or extracted raw text is available for this report."),
                styles["Body"],
            ),
        ]
        doc.build(story, onFirstPage=self._decorate_page, onLaterPages=self._decorate_page)
        return buffer.getvalue()

    def _decorate_page(self, canvas, doc) -> None:  # pragma: no cover - visual rendering
        canvas.saveState()
        canvas.setFillColor(colors.HexColor(THEME["background"]))
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor(THEME["muted"]))
        canvas.setFont("Helvetica", 8)
        canvas.drawString(doc.leftMargin, 10 * mm, "DoctorCopilot")
        canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    def _info_table(self, items: list[tuple[str, str]], styles):
        rows = []
        for index in range(0, len(items), 2):
            cells = []
            for label, value in items[index:index + 2]:
                cells.append(
                    Paragraph(
                        f"<font color='{THEME['muted']}'>{escape(label.upper())}</font><br/>{escape(_sanitize(value))}",
                        styles["BodyStrong"],
                    )
                )
            if len(cells) == 1:
                cells.append("")
            rows.append(cells)
        table = Table(rows, colWidths=[82 * mm, 82 * mm], hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(THEME["surface_soft"])),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor(THEME["line"])),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor(THEME["line"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        return table

    def _data_table(self, headers, rows, widths, styles):
        table_rows = [[Paragraph(f"<b>{escape(header)}</b>", styles["BodyStrong"]) for header in headers]]
        table_rows.extend(rows or [[Paragraph("No structured values", styles["Body"]), "", "", ""]])
        table = Table(table_rows, colWidths=widths, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(THEME["surface_soft"])),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor(THEME["text"])),
                    ("BOX", (0, 0), (-1, -1), 0.35, colors.HexColor(THEME["line"])),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor(THEME["line"])),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        return table

    def _bullet_paragraphs(self, items: list[str], styles) -> list[Any]:
        return [Paragraph(f"&bull; {escape(_sanitize(item))}", styles["Body"]) for item in items if item]

    def _clinical_interpretation(self, report: Report) -> list[str]:
        findings = self._abnormal_findings(report)
        ai_insights = [getattr(item, "description", "") for item in (report.insights or []) if getattr(item, "description", "")]
        combined = []
        for item in [*findings, *ai_insights, report.summary or ""]:
            cleaned = _clean_sentence(item)
            if cleaned:
                combined.append(cleaned)
        return list(dict.fromkeys(combined))[:5]

    def _abnormal_findings(self, report: Report) -> list[str]:
        findings = []
        for parameter in report.parameters or []:
            status = str(parameter.get("status") or parameter.get("interpretation") or "").lower()
            if not _is_abnormal_status(status):
                continue
            label = _labelize(parameter.get("name"))
            value_text = _format_value_unit(parameter.get("value"), parameter.get("unit"))
            if label == "Platelets" and status == "low":
                findings.append(f"Platelet count is low at {value_text}, compatible with a thrombocytopenic pattern.")
            elif label == "Vitamin B12" and status in {"low", "deficient"}:
                findings.append(f"Vitamin B12 is low at {value_text}, suggesting a deficiency pattern.")
            elif label == "Vitamin D" and status in {"deficient", "insufficient"}:
                findings.append(f"Vitamin D is {status} at {value_text}.")
            else:
                findings.append(f"{label} is {status} at {value_text}.")
        return list(dict.fromkeys(_clean_sentence(item) for item in findings if item))[:5]

    def _parameter_rows(self, report: Report, styles) -> list[list[Any]]:
        rows = []
        for parameter in report.parameters or []:
            rows.append(
                [
                    Paragraph(escape(_labelize(parameter.get("name"))), styles["Body"]),
                    Paragraph(escape(_format_value_unit(parameter.get("value"), parameter.get("unit"))), styles["Body"]),
                    Paragraph(escape(_sanitize(parameter.get("reference_range") or "-")), styles["Body"]),
                    Paragraph(escape(str(parameter.get("status") or parameter.get("interpretation") or "unknown").title()), styles["Body"]),
                ]
            )
        return rows
