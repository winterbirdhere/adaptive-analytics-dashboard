"""
SQLite database layer for the Student Engagement Analytics Dashboard.
Schema: courses, students, engagement_logs, assessments, risk_flags.
"""

import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "dashboard.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                semester TEXT NOT NULL DEFAULT '2026-Spring'
            );

            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                enrolled_date TEXT NOT NULL DEFAULT '2026-01-15'
            );

            CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                course_id INTEGER NOT NULL REFERENCES courses(id),
                UNIQUE(student_id, course_id)
            );

            CREATE TABLE IF NOT EXISTS engagement_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                course_id INTEGER NOT NULL REFERENCES courses(id),
                event_type TEXT NOT NULL CHECK(event_type IN (
                    'login','logout','forum_post','forum_reply',
                    'quiz_start','quiz_submit','resource_view',
                    'assignment_submit','video_watch'
                )),
                event_date TEXT NOT NULL,
                duration_min REAL DEFAULT 0,
                metadata TEXT DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                course_id INTEGER NOT NULL REFERENCES courses(id),
                assessment_type TEXT NOT NULL CHECK(assessment_type IN (
                    'quiz','midterm','final','assignment','lab'
                )),
                title TEXT NOT NULL,
                score REAL NOT NULL,
                max_score REAL NOT NULL DEFAULT 100,
                submitted_date TEXT NOT NULL,
                attempt_number INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS risk_flags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                course_id INTEGER NOT NULL REFERENCES courses(id),
                risk_level TEXT NOT NULL CHECK(risk_level IN ('High','Medium','Low')),
                risk_score REAL NOT NULL DEFAULT 0,
                factors TEXT NOT NULL DEFAULT '{}',
                computed_date TEXT NOT NULL,
                UNIQUE(student_id, course_id, computed_date)
            );

            CREATE INDEX IF NOT EXISTS idx_engagement_student ON engagement_logs(student_id);
            CREATE INDEX IF NOT EXISTS idx_engagement_date ON engagement_logs(event_date);
            CREATE INDEX IF NOT EXISTS idx_engagement_type ON engagement_logs(event_type);
            CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id);
            CREATE INDEX IF NOT EXISTS idx_risk_student ON risk_flags(student_id);

            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL REFERENCES students(id),
                course_id INTEGER,
                rule_id TEXT NOT NULL,
                priority TEXT NOT NULL CHECK(priority IN ('high','medium','low')),
                title TEXT NOT NULL,
                explanation TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','acted','dismissed','saved')),
                created_date TEXT NOT NULL,
                updated_date TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_rec_student ON recommendations(student_id);
            CREATE INDEX IF NOT EXISTS idx_rec_status ON recommendations(status);

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL CHECK(category IN ('bug','feature','usability','other')),
                message TEXT NOT NULL,
                created_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'action' CHECK(severity IN ('urgent','action','positive')),
                is_read INTEGER NOT NULL DEFAULT 0,
                created_date TEXT NOT NULL
            );
        """)
