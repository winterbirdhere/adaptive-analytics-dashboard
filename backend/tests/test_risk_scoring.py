import sqlite3
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from risk_scoring import compute_risk_for_student  # noqa: E402


AS_OF = date(2026, 4, 1)


def create_connection():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE engagement_logs (
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            duration_min REAL NOT NULL
        );

        CREATE TABLE assessments (
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            assessment_type TEXT NOT NULL,
            score REAL NOT NULL
        );
        """
    )
    return connection


class RiskScoringTests(unittest.TestCase):
    def setUp(self):
        self.connection = create_connection()

    def tearDown(self):
        self.connection.close()

    def test_inactive_student_is_high_risk(self):
        result = compute_risk_for_student(
            self.connection,
            student_id=1,
            as_of=AS_OF.isoformat(),
        )

        self.assertEqual(result["risk_level"], "High")
        self.assertEqual(result["risk_score"], 100.0)

    def test_fully_engaged_student_is_low_risk(self):
        window_start = AS_OF - timedelta(days=29)

        for offset in range(30):
            event_date = (window_start + timedelta(days=offset)).isoformat()
            self.connection.execute(
                "INSERT INTO engagement_logs VALUES (?, ?, ?, ?, ?)",
                (1, 1, "login", event_date, 45),
            )

        for _ in range(8):
            self.connection.execute(
                "INSERT INTO engagement_logs VALUES (?, ?, ?, ?, ?)",
                (1, 1, "forum_post", AS_OF.isoformat(), 5),
            )

        self.connection.execute(
            "INSERT INTO assessments VALUES (?, ?, ?, ?)",
            (1, 1, "quiz", 85),
        )

        result = compute_risk_for_student(
            self.connection,
            student_id=1,
            course_id=1,
            as_of=AS_OF.isoformat(),
        )

        self.assertEqual(result["risk_level"], "Low")
        self.assertEqual(result["risk_score"], 0.0)

    def test_course_filter_keeps_risk_context_specific(self):
        self.connection.execute(
            "INSERT INTO engagement_logs VALUES (?, ?, ?, ?, ?)",
            (1, 1, "login", AS_OF.isoformat(), 45),
        )
        self.connection.execute(
            "INSERT INTO assessments VALUES (?, ?, ?, ?)",
            (1, 1, "quiz", 85),
        )

        course_one = compute_risk_for_student(
            self.connection,
            student_id=1,
            course_id=1,
            as_of=AS_OF.isoformat(),
        )
        course_two = compute_risk_for_student(
            self.connection,
            student_id=1,
            course_id=2,
            as_of=AS_OF.isoformat(),
        )

        self.assertLess(course_one["risk_score"], course_two["risk_score"])
        self.assertEqual(course_two["risk_level"], "High")


if __name__ == "__main__":
    unittest.main()
