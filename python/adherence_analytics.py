"""
CarePill Healthcare Analytics Engine (Python 3)
Domain: Senior Medication Adherence & Schedule Optimization

This module analyzes historical adherence data, calculates compliance percentages,
identifies missed dosage patterns, and exports statistical reports for healthcare providers.
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any


class AdherenceAnalyticsEngine:
    def __init__(self, patient_id: str = "PATIENT-8821", patient_name: str = "Eleanor Vance (Age 74)"):
        self.patient_id = patient_id
        self.patient_name = patient_name
        self.log_history: List[Dict[str, Any]] = []

    def load_sample_history(self):
        """Populates realistic 7-day medication logs for elderly patient analysis."""
        today = datetime.now()
        medications = [
            {"id": "m1", "name": "Metformin", "dose": "500mg", "slot": "Morning"},
            {"id": "m2", "name": "Lisinopril", "dose": "10mg", "slot": "Morning"},
            {"id": "m3", "name": "Calcium + D3", "dose": "600mg", "slot": "Afternoon"},
            {"id": "m4", "name": "Atorvastatin", "dose": "20mg", "slot": "Bedtime"}
        ]

        # Generate 7 days of historical logs
        for day_offset in range(6, -1, -1):
            log_date = today - timedelta(days=day_offset)
            date_str = log_date.strftime("%Y-%m-%d")

            for med in medications:
                # Simulate high senior adherence (approx 90% compliance)
                # Intentionally simulate 2 missed evening/afternoon doses to demonstrate analytics
                is_missed = (day_offset == 3 and med["slot"] == "Afternoon") or \
                            (day_offset == 1 and med["slot"] == "Bedtime")

                self.log_history.append({
                    "date": date_str,
                    "medication_id": med["id"],
                    "medication_name": med["name"],
                    "dosage": med["dose"],
                    "slot": med["slot"],
                    "scheduled_time": "08:00" if med["slot"] == "Morning" else "13:00" if med["slot"] == "Afternoon" else "21:30",
                    "status": "MISSED" if is_missed else "TAKEN",
                    "recorded_at": None if is_missed else (log_date.strftime("%Y-%m-%d") + " 08:15")
                })

    def calculate_compliance_summary(self) -> Dict[str, Any]:
        """Calculates adherence rates, streak, and clinical risk evaluation."""
        if not self.log_history:
            return {"error": "No logs recorded."}

        total_scheduled = len(self.log_history)
        total_taken = sum(1 for log in self.log_history if log["status"] == "TAKEN")
        total_missed = sum(1 for log in self.log_history if log["status"] == "MISSED")

        adherence_percentage = round((total_taken / total_scheduled) * 100, 2)

        # Senior Clinical Risk Evaluation
        if adherence_percentage >= 90.0:
            clinical_risk = "LOW_RISK"
            recommendation = "Excellent adherence. Maintain current routine."
        elif adherence_percentage >= 75.0:
            clinical_risk = "MODERATE_RISK"
            recommendation = "A few doses missed. Recommend automated voice alarms or caregiver check-in."
        else:
            clinical_risk = "HIGH_RISK"
            recommendation = "Urgent attention required: Caregiver notification dispatched."

        # Group by medication to find which medicine is most missed
        missed_by_med = {}
        for log in self.log_history:
            if log["status"] == "MISSED":
                name = log["medication_name"]
                missed_by_med[name] = missed_by_med.get(name, 0) + 1

        return {
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "evaluation_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_doses_scheduled": total_scheduled,
            "total_doses_taken": total_taken,
            "total_doses_missed": total_missed,
            "adherence_rate_pct": adherence_percentage,
            "clinical_risk_tier": clinical_risk,
            "clinical_recommendation": recommendation,
            "missed_breakdown_by_medicine": missed_by_med
        }

    def export_clinical_report(self, filepath: str = "clinical_adherence_report.json") -> str:
        """Serializes analytics to a formatted JSON report for physicians."""
        summary = self.calculate_compliance_summary()
        summary["logs"] = self.log_history

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

        return filepath


if __name__ == "__main__":
    print("=" * 65)
    print("CarePill - Elderly Adherence Analytics Engine (Python)")
    print("=" * 65)

    analytics = AdherenceAnalyticsEngine()
    analytics.load_sample_history()
    report = analytics.calculate_compliance_summary()

    print(f"Patient: {report['patient_name']} (ID: {report['patient_id']})")
    print(f"Evaluation Window: 7 Days (Total Doses: {report['total_doses_scheduled']})")
    print(f"Adherence Compliance: {report['adherence_rate_pct']}%")
    print(f"Risk Tier: {report['clinical_risk_tier']}")
    print(f"Physician Note: {report['clinical_recommendation']}")
    print("-" * 65)
    print("Missed Doses Breakdown:", report['missed_breakdown_by_medicine'])
    print("=" * 65)
