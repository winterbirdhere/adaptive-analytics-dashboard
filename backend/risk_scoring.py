"""
Rule-based risk scoring system for student engagement.

Computes a 0-100 risk score from engagement indicators, then maps to High/Medium/Low.
Designed so an ML model can replace or augment this later by implementing the same interface.

Risk factors (weighted):
  - login_frequency:  30%  (logins per 30 days, linear scale 0-30)
  - time_on_task:     25%  (avg session duration, linear scale 0-45 min)
  - forum_activity:   15%  (forum posts per 30 days, linear scale 0-8)
  - quiz_performance: 20%  (avg quiz score, linear scale 0-85%)
  - recency:          10%  (days since last activity, linear scale 0-14 days)

Thresholds:
  - risk_score >= 70 ??High
  - risk_score >= 45 ??Medium
  - risk_score < 45  ??Low

Note: risk_score is "risk" not "health" ??higher = worse.
"""

import json
from datetime import date, timedelta
from demo_config import today as demo_today


def compute_risk_for_student(conn, student_id, course_id=None, as_of=None):
    """
    Compute risk score and level for a single student.
    If course_id is None, aggregates across all enrolled courses.
    Returns dict with risk_level, risk_score, and factor breakdown.
    """
    if as_of is None:
        as_of = demo_today().isoformat()

    window_start = (date.fromisoformat(as_of) - timedelta(days=29)).isoformat()

    course_filter = ""
    params = [student_id, window_start, as_of]
    if course_id:
        course_filter = "AND course_id = ?"
        params.append(course_id)

    # Login count in window
    login_count = conn.execute(
        f"SELECT COUNT(*) FROM engagement_logs WHERE student_id=? AND event_date>=? AND event_date<=? AND event_type='login' {course_filter}",
        params,
    ).fetchone()[0]

    # Avg session duration
    avg_duration = conn.execute(
        f"SELECT COALESCE(AVG(duration_min), 0) FROM engagement_logs WHERE student_id=? AND event_date>=? AND event_date<=? AND event_type='login' {course_filter}",
        params,
    ).fetchone()[0]

    # Forum posts
    forum_count = conn.execute(
        f"SELECT COUNT(*) FROM engagement_logs WHERE student_id=? AND event_date>=? AND event_date<=? AND event_type IN ('forum_post','forum_reply') {course_filter}",
        params,
    ).fetchone()[0]

    # Quiz avg score
    quiz_params = [student_id]
    quiz_course_filter = ""
    if course_id:
        quiz_course_filter = "AND course_id = ?"
        quiz_params.append(course_id)
    quiz_avg = conn.execute(
        f"SELECT COALESCE(AVG(score), 0) FROM assessments WHERE student_id=? AND assessment_type='quiz' {quiz_course_filter}",
        quiz_params,
    ).fetchone()[0]

    # Days since last activity
    last_params = [student_id, window_start]
    last_course_filter = ""
    if course_id:
        last_course_filter = "AND course_id = ?"
        last_params.append(course_id)
    last_event = conn.execute(
        f"SELECT MAX(event_date) FROM engagement_logs WHERE student_id=? AND event_date>=? {last_course_filter}",
        last_params,
    ).fetchone()[0]

    if last_event:
        days_inactive = max(0, (date.fromisoformat(as_of) - date.fromisoformat(last_event)).days)
    else:
        days_inactive = 30

    # --- Normalize to 0-100 risk subscores (higher = more risk) ---

    # Logins: 0 logins = 100 risk, 30+ logins = 0 risk
    login_risk = max(0, min(100, 100 - (login_count / 30) * 100))

    # Time on task: 0 min = 100 risk, 45+ min avg = 0 risk
    time_risk = max(0, min(100, 100 - (avg_duration / 45) * 100))

    # Forum: 0 posts = 100 risk, 8+ posts = 0 risk
    forum_risk = max(0, min(100, 100 - (forum_count / 8) * 100))

    # Quiz: 0% = 100 risk, 85%+ = 0 risk
    quiz_risk = max(0, min(100, 100 - (quiz_avg / 85) * 100))

    # Recency: 0 days = 0 risk, 14+ days = 100 risk
    recency_risk = max(0, min(100, (days_inactive / 14) * 100))

    # Weighted composite
    risk_score = round(
        login_risk * 0.30
        + time_risk * 0.25
        + forum_risk * 0.15
        + quiz_risk * 0.20
        + recency_risk * 0.10,
        1,
    )

    # Classify — selective thresholds to reduce noise
    if risk_score >= 70:
        risk_level = "High"
    elif risk_score >= 45:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    factors = {
        "login_count": login_count,
        "avg_duration_min": round(avg_duration, 1),
        "forum_posts": forum_count,
        "quiz_avg": round(quiz_avg, 1),
        "days_inactive": days_inactive,
        "subscores": {
            "login_risk": round(login_risk, 1),
            "time_risk": round(time_risk, 1),
            "forum_risk": round(forum_risk, 1),
            "quiz_risk": round(quiz_risk, 1),
            "recency_risk": round(recency_risk, 1),
        },
    }

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "factors": factors,
    }


def compute_all_risks(conn, course_id=None, as_of=None):
    """Compute risk for all students. Optionally filter by course."""
    if course_id:
        students = conn.execute(
            "SELECT DISTINCT s.id, s.name FROM students s "
            "JOIN enrollments e ON s.id = e.student_id "
            "WHERE e.course_id = ? ORDER BY s.name",
            (course_id,),
        ).fetchall()
    else:
        students = conn.execute(
            "SELECT id, name FROM students ORDER BY name"
        ).fetchall()

    results = []
    for s in students:
        risk = compute_risk_for_student(conn, s["id"], course_id, as_of)
        results.append({
            "student_id": s["id"],
            "student_name": s["name"],
            **risk,
        })
    return results


def persist_risks(conn, course_id=None, as_of=None):
    """Compute and store risk flags in the risk_flags table."""
    if as_of is None:
        as_of = demo_today().isoformat()

    if course_id:
        # Score for a specific course
        results = compute_all_risks(conn, course_id, as_of)
        for r in results:
            conn.execute(
                "INSERT OR REPLACE INTO risk_flags (student_id, course_id, risk_level, risk_score, factors, computed_date) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (r["student_id"], course_id, r["risk_level"], r["risk_score"],
                 json.dumps(r["factors"]), as_of),
            )
        return results
    else:
        # Score each student per enrolled course
        enrollments = conn.execute(
            "SELECT DISTINCT student_id, course_id FROM enrollments"
        ).fetchall()
        all_results = []
        for e in enrollments:
            risk = compute_risk_for_student(conn, e["student_id"], e["course_id"], as_of)
            conn.execute(
                "INSERT OR REPLACE INTO risk_flags (student_id, course_id, risk_level, risk_score, factors, computed_date) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (e["student_id"], e["course_id"], risk["risk_level"], risk["risk_score"],
                 json.dumps(risk["factors"]), as_of),
            )
            all_results.append({"student_id": e["student_id"], **risk})
        return all_results
