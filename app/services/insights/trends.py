from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.report import Report
from app.schemas.trends import PatientTrendsResponse, TrendMetric, TrendValuePoint


class TrendService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def build_trends(self, patient_id: UUID) -> PatientTrendsResponse:
        reports = await self._fetch_reports(patient_id)
        report_summaries: list[dict[str, Any]] = []
        normalization_trace: dict[str, dict[str, Any]] = {}
        deduplication_log: list[dict[str, Any]] = []
        unit_corrections: list[dict[str, Any]] = []
        conflict_resolutions: list[dict[str, Any]] = []
        cleaned_entries: list[dict[str, Any]] = []
        seen_signatures: set[tuple[str | None, tuple[tuple[str, float], ...]]] = set()

        for report in reports:
            report_date = self._resolve_report_date(report)
            parameters = report.parameters or self._parameters_from_extracted_data(report)
            report_summaries.append(
                {
                    "id": report.id,
                    "report_date": report_date.isoformat() if report_date else None,
                    "lab_name": report.lab_name,
                    "report_type": report.report_type,
                    "summary": report.summary,
                    "insights": [insight.title for insight in report.insights[:2]],
                    "metadata": report.report_metadata or {},
                }
            )

            cleaned_parameters: list[dict[str, Any]] = []
            for param in parameters:
                cleaned = self._normalize_trend_parameter(param, unit_corrections)
                if cleaned:
                    cleaned_parameters.append(cleaned)

            if not report_date:
                deduplication_log.append(
                    {
                        "report_id": str(report.id),
                        "action": "skipped",
                        "reason": "missing_report_date",
                    }
                )
                continue

            if not cleaned_parameters:
                deduplication_log.append(
                    {
                        "report_id": str(report.id),
                        "date": report_date.isoformat(),
                        "action": "removed",
                        "reason": "empty_report",
                    }
                )
                continue

            signature = self._report_signature(report_date, cleaned_parameters)
            if signature in seen_signatures:
                deduplication_log.append(
                    {
                        "report_id": str(report.id),
                        "date": report_date.isoformat(),
                        "action": "removed",
                        "reason": "duplicate_report_same_date_same_values",
                    }
                )
                continue

            seen_signatures.add(signature)
            cleaned_entries.append(
                {
                    "report": report,
                    "date": report_date.isoformat(),
                    "parameters": cleaned_parameters,
                }
            )

        canonical_debug_entries = self._canonical_entries_by_date(cleaned_entries)
        normalized_table, sorted_series = self._build_clean_timeseries(
            cleaned_entries,
            normalization_trace,
            conflict_resolutions,
        )
        metrics = self._build_metrics(sorted_series)
        summary = self.generate_trend_summary(sorted_series, metrics)
        anomalies = self._build_anomalies(sorted_series, metrics)
        debug = self._build_debug_payload(
            canonical_debug_entries,
            normalization_trace,
            sorted_series,
            metrics,
            deduplication_log,
            unit_corrections,
            conflict_resolutions,
        )
        return PatientTrendsResponse(
            patient_id=patient_id,
            table=normalized_table,
            series=sorted_series,
            metrics=metrics,
            summary=summary,
            anomalies=anomalies,
            reports=report_summaries,
            debug=debug,
        )

    def generate_trend_summary(
        self,
        series: dict[str, list[TrendValuePoint]],
        metrics: dict[str, TrendMetric],
    ) -> list[str]:
        summary: list[str] = []
        improving = 0
        declining = 0
        for name, points in series.items():
            if len(points) < 2:
                continue
            metric = metrics[name]
            label = self._label(name)
            statuses = [self._derive_status(name, point) for point in points]
            transition_summary = self._summarize_status_transition(label, statuses, metric, name)
            if transition_summary:
                summary.append(transition_summary)
            condition_summary = self._build_condition_level_insight(name, points, statuses)
            if condition_summary:
                summary.append(condition_summary)
            if metric.direction == "increasing" and statuses[-1] in {"normal", "sufficient"}:
                improving += 1
            elif metric.direction == "decreasing" or statuses[-1] in {"low", "high", "deficient", "insufficient"}:
                declining += 1

        system_summary = self._build_system_level_insight(improving, declining)
        if system_summary:
            summary.append(system_summary)
        return list(dict.fromkeys(summary))

    async def _fetch_reports(self, patient_id: UUID) -> list[Report]:
        statement = (
            select(Report)
            .where(Report.patient_id == patient_id)
            .options(selectinload(Report.insights), selectinload(Report.extracted_data))
            .order_by(Report.report_date.asc(), Report.created_at.asc())
        )
        return list((await self.db.scalars(statement)).all())

    def _build_table(
        self,
        rows: list[dict[str, Any]],
        series: dict[str, list[TrendValuePoint]],
    ) -> list[dict[str, Any]]:
        columns = sorted(series.keys())
        ordered_rows = sorted(rows, key=lambda row: row["date"])
        normalized_rows: list[dict[str, Any]] = []
        for row in ordered_rows:
            normalized = {"date": row["date"]}
            for column in columns:
                normalized[column] = row.get(column)
            normalized_rows.append(normalized)
        return normalized_rows

    def _build_clean_timeseries(
        self,
        cleaned_entries: list[dict[str, Any]],
        normalization_trace: dict[str, dict[str, Any]],
        conflict_resolutions: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, list[TrendValuePoint]]]:
        grouped: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

        for entry in cleaned_entries:
            for parameter in entry["parameters"]:
                grouped[entry["date"]][parameter["name"]].append(
                    {
                        **parameter,
                        "report_id": entry["report"].id,
                        "report_type": entry["report"].report_type,
                    }
                )

        rows: list[dict[str, Any]] = []
        series: dict[str, list[TrendValuePoint]] = defaultdict(list)
        for row_date in sorted(grouped.keys()):
            row: dict[str, Any] = {"date": row_date}
            for parameter_name, candidates in grouped[row_date].items():
                resolved = self._resolve_parameter_conflict(
                    row_date,
                    parameter_name,
                    candidates,
                    conflict_resolutions,
                )
                row[parameter_name] = resolved["value"]
                trace = normalization_trace.setdefault(
                    parameter_name,
                    {
                        "original_name": resolved.get("original_name") or parameter_name,
                        "normalized_name": parameter_name,
                        "values": [],
                    },
                )
                trace["values"].append(
                    {
                        "date": row_date,
                        "value": resolved["value"],
                        "unit": resolved.get("unit"),
                        "status": resolved.get("status") or resolved.get("interpretation"),
                    }
                )
                series[parameter_name].append(
                    TrendValuePoint(
                        date=row_date,
                        value=resolved["value"],
                        unit=resolved.get("unit"),
                        status=resolved.get("status") or resolved.get("interpretation"),
                        report_id=resolved.get("report_id"),
                        report_type=resolved.get("report_type"),
                    )
                )
            rows.append(row)

        sorted_series = {
            key: self._deduplicate_series_points(sorted(points, key=lambda point: point.date))
            for key, points in series.items()
        }
        normalized_rows = self._build_table(rows, sorted_series)
        return normalized_rows, sorted_series

    def _build_metrics(self, series: dict[str, list[TrendValuePoint]]) -> dict[str, TrendMetric]:
        metrics: dict[str, TrendMetric] = {}
        for name, points in series.items():
            if not points:
                continue
            first_value = points[0].value
            last_value = points[-1].value
            delta = round(last_value - first_value, 2)
            percent = None
            if first_value != 0:
                percent = round((delta / first_value) * 100, 2)
            direction = self._classify_direction([point.value for point in points])
            stability_score = self._calculate_stability_score([point.value for point in points])
            metrics[name] = TrendMetric(
                delta=delta,
                percentage_change=percent,
                change=self._format_percentage_change(percent),
                direction=direction,
                stability_score=stability_score,
                stability=self._stability_label(stability_score),
                trend=direction,
                unit=points[-1].unit,
            )
        return metrics

    def _resolve_report_date(self, report: Report) -> date | None:
        return (
            report.report_date
            or report.sample_collection_date
            or report.report_generation_date
            or (report.created_at.date() if report.created_at else None)
        )

    def _classify_direction(self, values: list[float]) -> str:
        first_value = values[0]
        last_value = values[-1]
        delta = last_value - first_value
        threshold = max(abs(first_value) * 0.05, 0.5)
        if delta > threshold:
            return "increasing"
        if delta < -threshold:
            return "decreasing"
        return "stable"

    def _calculate_stability_score(self, values: list[float]) -> float:
        if len(values) <= 1:
            return 100.0

        deltas = [abs(values[index] - values[index - 1]) for index in range(1, len(values))]
        baseline = max(sum(abs(value) for value in values) / len(values), 1.0)
        volatility_ratio = sum(deltas) / len(deltas) / baseline
        stability_score = max(0.0, min(100.0, round(100 - (volatility_ratio * 100), 2)))
        return stability_score

    def _stability_label(self, score: float) -> str:
        if score >= 85:
            return "stable"
        if score >= 60:
            return "watchful"
        return "volatile"

    def _format_percentage_change(self, percent: float | None) -> str | None:
        if percent is None:
            return None
        prefix = "+" if percent > 0 else ""
        return f"{prefix}{percent}%"

    def _label(self, name: str) -> str:
        return name.replace("_", " ").capitalize()

    def _derive_status(self, name: str, point: TrendValuePoint) -> str:
        if point.status:
            return point.status
        if name == "vitamin_d":
            if point.value < 20:
                return "deficient"
            if point.value <= 30:
                return "insufficient"
            return "sufficient"
        if self._is_low(name, point.value):
            return "low"
        if self._is_high(name, point.value):
            return "high"
        return "normal"

    def _summarize_status_transition(
        self,
        label: str,
        statuses: list[str],
        metric: TrendMetric,
        name: str,
    ) -> str | None:
        first_status = statuses[0]
        last_status = statuses[-1]

        if all(status == last_status for status in statuses):
            if last_status in {"low", "deficient", "insufficient"}:
                return f"{label} remains consistently {last_status}"
            if last_status == "high":
                return f"{label} remains consistently high"
            return f"{label} stable within the normal range"

        if first_status in {"low", "deficient", "insufficient"} and last_status in {"normal", "sufficient"}:
            return f"{label} improved from {first_status} to {last_status}"
        if first_status == "high" and last_status in {"normal", "sufficient"}:
            return f"{label} normalized over time"
        if first_status in {"normal", "sufficient"} and last_status in {"low", "deficient", "insufficient"}:
            return f"{label} declined from {first_status} to {last_status}"
        if first_status in {"normal", "sufficient"} and last_status == "high":
            return f"{label} increased into the high range"
        if first_status in {"low", "deficient", "insufficient"} and last_status in {"low", "deficient", "insufficient"}:
            return f"{label} shows a persistent low pattern"
        if metric.trend == "stable":
            return f"{label} remained clinically stable"
        if metric.trend == "increasing":
            return f"{label} shows an upward trend"
        if metric.trend == "decreasing":
            return f"{label} shows a downward trend"
        return None

    def _build_condition_level_insight(
        self,
        name: str,
        points: list[TrendValuePoint],
        statuses: list[str],
    ) -> str | None:
        abnormal_statuses = {"low", "high", "deficient", "insufficient"}
        consecutive_abnormal = sum(1 for status in statuses if status in abnormal_statuses)
        label = self._label(name)

        if name == "vitamin_b12" and consecutive_abnormal >= 2:
            return f"Persistent Vitamin B12 deficiency since {points[0].date}"
        if name == "platelets" and consecutive_abnormal >= 3 and all(status == "low" for status in statuses[-3:]):
            return f"Platelets low in {min(3, len(points))} consecutive reports"
        if name == "iron" and consecutive_abnormal >= 2 and all(status == "high" for status in statuses[-2:]):
            return "Iron consistently high across recent reports"
        if consecutive_abnormal >= 3 and statuses[-1] in abnormal_statuses:
            return f"{label} has remained abnormal across multiple reports"
        return None

    def _build_system_level_insight(self, improving: int, declining: int) -> str | None:
        if improving >= 2 and improving > declining:
            return "Overall blood profile improving over time"
        if declining >= 2 and declining > improving:
            return "Multiple markers are trending in a concerning direction"
        return None

    def _build_anomalies(
        self,
        series: dict[str, list[TrendValuePoint]],
        metrics: dict[str, TrendMetric],
    ) -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []

        for name, points in series.items():
            if not points:
                continue

            label = self._label(name)
            statuses = [self._derive_status(name, point) for point in points]
            abnormal_statuses = {"low", "high", "deficient", "insufficient"}
            abnormal_count = sum(1 for status in statuses if status in abnormal_statuses)

            if abnormal_count >= 2 and statuses[-1] in abnormal_statuses:
                anomaly_type = f"persistent_{statuses[-1]}"
                anomalies.append(
                    {
                        "parameter": name,
                        "type": anomaly_type,
                        "message": f"{label} consistently {statuses[-1]} across {abnormal_count} reports",
                        "severity": "critical" if abnormal_count >= 3 else "warning",
                    }
                )

            if len(points) >= 2:
                previous = points[-2].value
                latest = points[-1].value
                if previous:
                    percent_change = round(((latest - previous) / previous) * 100, 2)
                    if percent_change <= -15:
                        anomalies.append(
                            {
                                "parameter": name,
                                "type": "sudden_drop",
                                "message": f"{label} dropped {abs(percent_change)}% from the last report",
                                "severity": "critical" if abs(percent_change) >= 25 else "warning",
                            }
                        )
                    elif percent_change >= 15:
                        anomalies.append(
                            {
                                "parameter": name,
                                "type": "sudden_rise",
                                "message": f"{label} increased {percent_change}% from the last report",
                                "severity": "warning",
                            }
                        )

            latest_point = points[-1]
            if self._is_critical_value(name, latest_point.value, statuses[-1]):
                anomalies.append(
                    {
                        "parameter": name,
                        "type": "critical_value",
                        "message": self._critical_value_message(name, latest_point.value, latest_point.unit),
                        "severity": "critical",
                    }
                )

        unique: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in anomalies:
            signature = f"{item['parameter']}|{item['type']}|{item['message']}"
            if signature in seen:
                continue
            seen.add(signature)
            unique.append(item)
        return unique

    def _is_critical_value(self, name: str, value: float, status: str) -> bool:
        if name == "platelets":
            return value < 100000 or value > 600000
        if name == "hemoglobin":
            return value < 9 or value > 19
        if name == "iron":
            return value > 190
        if name == "vitamin_b12":
            return status == "deficient" and value < 150
        return False

    def _critical_value_message(self, name: str, value: float, unit: str | None) -> str:
        label = self._label(name)
        if name == "platelets":
            return f"{label} is at a critically abnormal level ({value} {unit or ''}).".strip()
        if name == "iron":
            return f"{label} is markedly elevated ({value} {unit or ''}).".strip()
        if name == "vitamin_b12":
            return f"{label} is severely reduced ({value} {unit or ''}).".strip()
        return f"{label} is outside the expected range at {value} {unit or ''}.".strip()

    def _is_low(self, name: str, value: float) -> bool:
        thresholds = {"platelets": 150000, "hemoglobin": 12.0, "vitamin_b12": 200.0}
        return value < thresholds.get(name, float("-inf"))

    def _is_high(self, name: str, value: float) -> bool:
        thresholds = {"platelets": 450000, "hemoglobin": 17.5, "vitamin_b12": 900.0}
        return value > thresholds.get(name, float("inf"))

    def _parameters_from_extracted_data(self, report: Report) -> list[dict[str, Any]]:
        if not report.extracted_data or not report.extracted_data.key_values:
            return []
        return list(report.extracted_data.key_values.values())

    def _normalize_trend_parameter(
        self,
        param: dict[str, Any],
        unit_corrections: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        name = param.get("name")
        value = param.get("value")
        if not name or not isinstance(value, (float, int)):
            return None

        numeric_value = float(value)
        unit = str(param.get("unit") or "").strip()
        original_value = numeric_value
        original_unit = unit

        normalized_unit = unit.replace("μ", "µ")
        normalized_unit = normalized_unit.replace("uL", "µL").replace("ul", "µL")
        normalized_unit = normalized_unit.replace("ug/dL", "µg/dL")
        normalized_unit = normalized_unit.replace("x10^3/uL", "×10³/µL")
        normalized_unit = normalized_unit.replace("x10^3/µL", "×10³/µL")
        normalized_unit = normalized_unit.replace("x10^6/uL", "×10⁶/µL")
        normalized_unit = normalized_unit.replace("x10^6/µL", "×10⁶/µL")

        if name == "platelets":
            if numeric_value < 1000:
                numeric_value = round(numeric_value * 1000, 2)
            normalized_unit = "/µL"
        elif name == "white_blood_cells":
            if numeric_value > 1000:
                numeric_value = round(numeric_value / 1000, 2)
            normalized_unit = "×10³/µL"

        if numeric_value != original_value or normalized_unit != original_unit:
            unit_corrections.append(
                {
                    "parameter": name,
                    "from_value": original_value,
                    "to_value": numeric_value,
                    "from_unit": original_unit or None,
                    "to_unit": normalized_unit or None,
                }
            )

        return {
            **param,
            "value": numeric_value,
            "unit": normalized_unit or None,
        }

    def _normalize_trend_parameter(
        self,
        param: dict[str, Any],
        unit_corrections: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        name = param.get("name")
        value = param.get("value")
        if not name or not isinstance(value, (float, int)):
            return None

        numeric_value = float(value)
        unit = str(param.get("unit") or "").strip()
        original_value = numeric_value
        original_unit = unit

        unit_map = {
            "Î¼": "µ",
            "Âµ": "µ",
            "uL": "µL",
            "ul": "µL",
            "ug/dL": "µg/dL",
            "x10^3/uL": "×10³/µL",
            "x10^3/µL": "×10³/µL",
            "x10^6/uL": "×10⁶/µL",
            "x10^6/µL": "×10⁶/µL",
        }
        normalized_unit = unit
        for source, target in unit_map.items():
            normalized_unit = normalized_unit.replace(source, target)

        if name == "platelets":
            if numeric_value < 1000:
                numeric_value = round(numeric_value * 1000, 2)
            normalized_unit = "/µL"
        elif name == "white_blood_cells":
            if numeric_value > 1000:
                numeric_value = round(numeric_value / 1000, 2)
            normalized_unit = "×10³/µL"

        if numeric_value != original_value or normalized_unit != original_unit:
            unit_corrections.append(
                {
                    "parameter": name,
                    "from_value": original_value,
                    "to_value": numeric_value,
                    "from_unit": original_unit or None,
                    "to_unit": normalized_unit or None,
                }
            )

        return {
            **param,
            "value": numeric_value,
            "unit": normalized_unit or None,
        }

    def _resolve_parameter_conflict(
        self,
        row_date: str,
        parameter_name: str,
        candidates: list[dict[str, Any]],
        conflict_resolutions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if len(candidates) == 1:
            return candidates[0]

        values = [round(float(candidate["value"]), 4) for candidate in candidates]
        counts = Counter(values)
        most_common_value, frequency = counts.most_common(1)[0]
        selected = next(
            candidate
            for candidate in candidates
            if round(float(candidate["value"]), 4) == most_common_value
        )
        resolution = "most_frequent_value"

        if frequency == 1:
            spread = max(values) - min(values)
            baseline = max(abs(values[0]), 1.0)
            if spread / baseline <= 0.05:
                averaged = round(sum(values) / len(values), 2)
                selected = {**selected, "value": averaged}
                resolution = "averaged_consistent_values"
            else:
                resolution = "first_valid_value"

        conflict_resolutions.append(
            {
                "date": row_date,
                "parameter": parameter_name,
                "values_considered": values,
                "chosen_value": selected["value"],
                "strategy": resolution,
            }
        )
        return selected

    def _deduplicate_series_points(self, points: list[TrendValuePoint]) -> list[TrendValuePoint]:
        deduped: list[TrendValuePoint] = []
        seen_dates: set[str] = set()
        for point in points:
            if point.date in seen_dates:
                continue
            seen_dates.add(point.date)
            deduped.append(point)
        return deduped

    def _report_signature(
        self,
        report_date: date,
        parameters: list[dict[str, Any]],
    ) -> tuple[str | None, tuple[tuple[str, float], ...]]:
        return (
            report_date.isoformat() if report_date else None,
            tuple(
                sorted(
                    (parameter["name"], round(float(parameter["value"]), 4))
                    for parameter in parameters
                )
            ),
        )

    def _canonical_entries_by_date(self, cleaned_entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
        canonical: dict[str, dict[str, Any]] = {}
        for entry in cleaned_entries:
            canonical.setdefault(entry["date"], entry)
        return [canonical[entry_date] for entry_date in sorted(canonical.keys())]

    def _raw_text_preview(self, raw_text: str | None) -> str:
        preview = (raw_text or "").strip()[:300]
        return preview or "No raw text available."

    def _unique_log_entries(self, entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
        unique: list[dict[str, Any]] = []
        seen: set[str] = set()
        for entry in entries:
            signature = repr(sorted(entry.items()))
            if signature in seen:
                continue
            seen.add(signature)
            unique.append(entry)
        return unique

    def _build_debug_payload(
        self,
        canonical_debug_entries: list[dict[str, Any]],
        normalization_trace: dict[str, dict[str, Any]],
        series: dict[str, list[TrendValuePoint]],
        metrics: dict[str, TrendMetric],
        deduplication_log: list[dict[str, Any]],
        unit_corrections: list[dict[str, Any]],
        conflict_resolutions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        status_transitions: dict[str, dict[str, Any]] = {}
        deltas: dict[str, dict[str, Any]] = {}

        raw_reports = [
            {
                "id": entry["report"].id,
                "date": entry["date"],
                "raw_text_preview": self._raw_text_preview(entry["report"].raw_text),
                "report_type": entry["report"].report_type,
            }
            for entry in canonical_debug_entries
        ]
        metadata_snapshots = [
            {
                "id": entry["report"].id,
                "date": entry["date"],
                "metadata": entry["report"].report_metadata or {},
            }
            for entry in canonical_debug_entries
        ]

        for name, points in series.items():
            statuses = [self._derive_status(name, point) for point in points]
            final_interpretation = (
                self._summarize_status_transition(self._label(name), statuses, metrics[name], name)
                if len(points) >= 2
                else statuses[-1]
            )
            status_transitions[name] = {
                "values": [{"date": point.date, "value": point.value} for point in points],
                "statuses": statuses,
                "final_interpretation": final_interpretation,
            }
            deltas[name] = {
                "delta": metrics[name].delta,
                "percentage_change": metrics[name].percentage_change,
                "change": metrics[name].change,
                "direction": metrics[name].direction,
                "stability_score": metrics[name].stability_score,
                "stability": metrics[name].stability,
                "trend": metrics[name].trend,
            }

        return {
            "raw_reports": raw_reports,
            "normalized_parameters": normalization_trace,
            "metadata": metadata_snapshots,
            "trend_calculations": {
                "deltas": deltas,
                "status_transitions": status_transitions,
            },
            "deduplication_log": self._unique_log_entries(deduplication_log),
            "unit_corrections": self._unique_log_entries(unit_corrections),
            "conflict_resolutions": self._unique_log_entries(conflict_resolutions),
        }
