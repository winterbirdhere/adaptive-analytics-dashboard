"""
Feature engineering for the ML risk prediction model.

Extracts the same 5 engagement indicators used by the rule-based scorer,
but as raw numeric features (not normalized risk subscores).
The decision tree learns its own thresholds from the data.

Features:
  - login_count:      logins in 30-day window
  - avg_duration_min: average session duration (minutes)
  - forum_posts:      forum posts + replies in 30-day window
  - quiz_avg:         average quiz score (0-100)
  - days_inactive:    days since last activity

Label:
  - risk_level: High / Medium / Low (from rule-based scorer)
"""

import csv
import os
from datetime import date, timedelta
from database import get_db
from risk_scoring import compute_risk_for_student


def extract_features_for_student(conn, student_id, course_id=None, as_of=None):
    """Extract raw feature vector for one student."""
    risk = compute_risk_for_student(conn, student_id, course_id, as_of)
    f = risk["factors"]
    return {
        "student_id": student_id,
        "login_count": f["login_count"],
        "avg_duration_min": f["avg_duration_min"],
        "forum_posts": f["forum_posts"],
        "quiz_avg": f["quiz_avg"],
        "days_inactive": f["days_inactive"],
        "risk_level": risk["risk_level"],
        "risk_score": risk["risk_score"],
    }


def build_training_dataset(course_id=None, as_of=None):
    """Build feature matrix for all students. Returns list of dicts."""
    with get_db() as conn:
        if course_id:
            students = conn.execute(
                "SELECT DISTINCT s.id FROM students s "
                "JOIN enrollments e ON s.id = e.student_id "
                "WHERE e.course_id = ?", (course_id,)
            ).fetchall()
        else:
            students = conn.execute("SELECT id FROM students").fetchall()

        rows = []
        for s in students:
            row = extract_features_for_student(conn, s["id"], course_id, as_of)
            rows.append(row)
    return rows


def export_csv(path=None, course_id=None):
    """Export training dataset to CSV file."""
    if path is None:
        path = os.path.join(os.path.dirname(__file__), "training_data.csv")

    rows = build_training_dataset(course_id)
    if not rows:
        print("No data to export.")
        return path

    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} rows to {path}")
    return path


if __name__ == "__main__":
    export_csv()
