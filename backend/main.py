"""
Student Engagement Analytics Dashboard ??Backend API
All endpoints read from SQLite. Risk scoring is rule-based.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import init_db, get_db
from risk_scoring import compute_all_risks, persist_risks
from ml_model import load_model, predict_student, predict_all, train_model, FEATURE_NAMES, LABEL_NAMES, get_model_diagnostics
from clustering import cluster_students, find_best_k
from recommendations import generate_all_recommendations, persist_recommendations, update_recommendation_status
from datetime import date, timedelta
import json
import time
import os
from demo_config import today as _today


# ---------------------------------------------------------------------------
# Simple TTL cache for expensive computations
# ---------------------------------------------------------------------------
_cache = {}
_CACHE_TTL = 30  # seconds


def _cached(key, ttl=_CACHE_TTL):
    entry = _cache.get(key)
    if entry and (time.time() - entry[1]) < ttl:
        return entry[0]
    return None


def _set_cache(key, value):
    _cache[key] = (value, time.time())


def _invalidate_cache(prefix=""):
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys:
        del _cache[k]


def _parse_optional_int(value: str | None) -> int | None:
    """Parse an optional query param string to int, treating empty/None as None."""
    if value is None or value.strip() == "":
        return None
    return int(value)


# ---------------------------------------------------------------------------
# Pydantic response models (for OpenAPI schema generation)
# ---------------------------------------------------------------------------

class MetricsSummaryResponse(BaseModel):
    total_logins: int
    avg_time_on_task_min: float
    quiz_submissions: int
    forum_posts: int
    active_students: int
    total_enrolled: int
    at_risk_count: int
    risk_high: int
    risk_medium: int
    risk_low: int

class EngagementTrendResponse(BaseModel):
    days: list[str]
    logins: list[int]
    forum_posts: list[int]
    quiz_submissions: list[int]
    avg_duration: list[float]

class EngagementWeeklyResponse(BaseModel):
    weeks: list[str]
    quiz_submissions: list[int]
    forum_posts: list[int]
    resource_views: list[int]

class CategoryItem(BaseModel):
    name: str
    value: int
    percent: int

class EngagementCategoriesResponse(BaseModel):
    total: int
    categories: list[CategoryItem]

class StudentRow(BaseModel):
    id: int
    studentName: str
    riskLevel: str
    riskScore: float
    logins: int
    avgTimeOnTask: str
    forumPosts: int
    quizAvg: float
    activityTrend: list[int]

class StudentsResponse(BaseModel):
    students: list[StudentRow]

class AtRiskStudent(BaseModel):
    id: int
    name: str
    risk_level: str
    risk_score: float
    logins_30d: int
    avg_time_on_task_min: float
    forum_posts: int
    quiz_avg: float
    days_inactive: int

class RiskResponse(BaseModel):
    students: list[AtRiskStudent]
    total_at_risk: int
    high_risk_count: int
    threshold_note: str

class TypeStat(BaseModel):
    type: str
    count: int
    avg_score: float
    min_score: float
    max_score: float

class QuizBreakdownItem(BaseModel):
    title: str
    attempts: int
    avg_score: float
    pass_rate: float

class ScoreDistribution(BaseModel):
    field_0_20: int = 0
    field_21_40: int = 0
    field_41_60: int = 0
    field_61_80: int = 0
    field_81_100: int = 0

class AssessmentsResponse(BaseModel):
    type_stats: list[TypeStat]
    quiz_breakdown: list[QuizBreakdownItem]
    score_distribution: dict[str, int]

class CourseItem(BaseModel):
    id: int
    code: str
    name: str
    semester: str
    enrolled: int

class CoursesResponse(BaseModel):
    courses: list[CourseItem]


# --- ML Prediction response models ---

class PredictionResult(BaseModel):
    student_id: int
    student_name: str | None = None
    method: str
    risk_level: str
    confidence: float | None = None
    probabilities: dict[str, float] | None = None
    features: dict[str, float]
    rule_based_level: str | None = None
    rule_based_score: float | None = None

class SinglePredictionResponse(BaseModel):
    prediction: PredictionResult

class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResult]
    method: str
    total: int

class ModelInfoResponse(BaseModel):
    model_config = {"extra": "allow"}
    available: bool
    method: str


class ClusterSummary(BaseModel):
    cluster_id: int
    label: str
    count: int
    avg_login_count: float
    avg_avg_duration_min: float
    avg_forum_posts: float
    avg_quiz_avg: float
    avg_days_inactive: float
    avg_resource_views: float


class ClusterAssignment(BaseModel):
    student_id: int
    student_name: str
    cluster_id: int
    cluster_label: str
    x: float
    y: float
    features: dict[str, float]
    risk_level: str


class ClustersResponse(BaseModel):
    k: int
    silhouette_score: float
    pca_explained_variance: list[float]
    summaries: list[ClusterSummary]
    assignments: list[ClusterAssignment]


class RecommendationItem(BaseModel):
    id: int | None = None
    student_id: int
    student_name: str | None = None
    rule_id: str
    priority: str
    title: str
    explanation: str
    status: str = "pending"
    created_date: str | None = None
    updated_date: str | None = None


class RecommendationsResponse(BaseModel):
    model_config = {"extra": "allow"}
    recommendations: list[RecommendationItem]
    total: int


class StatusUpdateRequest(BaseModel):
    status: str


import os

app = FastAPI(title="Student Engagement Analytics API")

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    # Auto-seed if the database is empty (e.g. fresh deploy on Render)
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        if count == 0:
            from seed import seed
            seed()
            from ml_model import train_model
            train_model()
            print("Auto-seeded empty database and trained ML model.")


# ---------------------------------------------------------------------------
# GET /metrics/summary
# ---------------------------------------------------------------------------
@app.get("/metrics/summary", response_model=MetricsSummaryResponse)
def metrics_summary(course_id: str | None = Query(default=None)):
    """Aggregated engagement metrics for stat cards."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []

        # 30-day window: today - 29 days to today (inclusive, 30 days total)
        # Matches the trend endpoint which generates days[0..29]
        window = (_today() - timedelta(days=29)).isoformat()
        end = _today().isoformat()

        total_logins = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='login' AND event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]

        avg_time = conn.execute(
            f"SELECT COALESCE(AVG(duration_min),0) FROM engagement_logs WHERE event_type='login' AND event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]

        quiz_attempts = conn.execute(
            f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' AND submitted_date>=? AND submitted_date<=? {'AND course_id = ?' if cid else ''}",
            [window, end] + p,
        ).fetchone()[0]

        forum_posts = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type IN ('forum_post','forum_reply') AND event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]

        active_students = conn.execute(
            f"SELECT COUNT(DISTINCT student_id) FROM engagement_logs WHERE event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]

        # Total enrolled students (for context alongside active count)
        if cid:
            total_enrolled = conn.execute(
                "SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE course_id = ?", (cid,)
            ).fetchone()[0]
        else:
            total_enrolled = conn.execute(
                "SELECT COUNT(*) FROM students"
            ).fetchone()[0]

        # Quick at-risk count using rule engine
        risks = compute_all_risks(conn, cid)
        at_risk = sum(1 for r in risks if r["risk_level"] == "High")
        risk_high = at_risk
        risk_medium = sum(1 for r in risks if r["risk_level"] == "Medium")
        risk_low = sum(1 for r in risks if r["risk_level"] == "Low")

    return {
        "total_logins": total_logins,
        "avg_time_on_task_min": round(avg_time, 1),
        "quiz_submissions": quiz_attempts,
        "forum_posts": forum_posts,
        "active_students": active_students,
        "total_enrolled": total_enrolled,
        "at_risk_count": at_risk,
        "risk_high": risk_high,
        "risk_medium": risk_medium,
        "risk_low": risk_low,
    }


# ---------------------------------------------------------------------------
# GET /dashboard — consolidated endpoint for the main dashboard page
# ---------------------------------------------------------------------------
@app.get("/dashboard")
def dashboard_data(course_id: str | None = Query(default=None)):
    """Single endpoint returning all data the dashboard needs in one response."""
    cid = _parse_optional_int(course_id)
    cache_key = f"dash:{cid}"
    cached = _cached(cache_key, ttl=15)
    if cached is not None:
        return cached

    with get_db() as conn:
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []
        window = (_today() - timedelta(days=29)).isoformat()
        end = _today().isoformat()

        # ── Metrics ──
        total_logins = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='login' AND event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]
        avg_time = conn.execute(
            f"SELECT COALESCE(AVG(duration_min),0) FROM engagement_logs WHERE event_type='login' AND event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]
        quiz_submissions = conn.execute(
            f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' AND submitted_date>=? AND submitted_date<=? {'AND course_id = ?' if cid else ''}",
            [window, end] + p,
        ).fetchone()[0]
        active_students = conn.execute(
            f"SELECT COUNT(DISTINCT student_id) FROM engagement_logs WHERE event_date>=? AND event_date<=? {cf}",
            [window, end] + p,
        ).fetchone()[0]
        if cid:
            total_enrolled = conn.execute(
                "SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE course_id = ?", (cid,)
            ).fetchone()[0]
        else:
            total_enrolled = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]

        risks = compute_all_risks(conn, cid)
        risk_high = sum(1 for r in risks if r["risk_level"] == "High")
        risk_medium = sum(1 for r in risks if r["risk_level"] == "Medium")
        risk_low = sum(1 for r in risks if r["risk_level"] == "Low")

        # ── 30-day trend (inline, no second endpoint call) ──
        day_labels = []
        logins_trend = []
        forum_trend = []
        quiz_trend = []
        dur_trend = []
        for i in range(30):
            d = (_today() - timedelta(days=29 - i)).isoformat()
            day_labels.append(d)
            logins_trend.append(conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='login' AND event_date=? {cf}", [d] + p
            ).fetchone()[0])
            forum_trend.append(conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type IN ('forum_post','forum_reply') AND event_date=? {cf}", [d] + p
            ).fetchone()[0])
            quiz_trend.append(conn.execute(
                f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' AND submitted_date=? {'AND course_id = ?' if cid else ''}", [d] + p
            ).fetchone()[0])
            dur_trend.append(round(conn.execute(
                f"SELECT COALESCE(AVG(duration_min), 0) FROM engagement_logs WHERE event_type='login' AND event_date=? {cf}", [d] + p
            ).fetchone()[0], 1))

        # ── Pending recommendations count ──
        # Use generate_all_recommendations for accuracy (matches notification count)
        # minus students who already have acted/dismissed/saved status
        pending_count = 0
        try:
            cache_key_pending = f"pending:{cid}"
            cached_pending = _cached(cache_key_pending, ttl=15)
            if cached_pending is not None:
                pending_count = cached_pending
            else:
                student_grouped, _flat = generate_all_recommendations(conn, cid)
                acted_ids = set()
                try:
                    acted_rows = conn.execute(
                        "SELECT DISTINCT student_id FROM recommendations "
                        "WHERE rule_id='consolidated' AND status IN ('acted','dismissed','saved')"
                    ).fetchall()
                    acted_ids = {r["student_id"] for r in acted_rows}
                except Exception:
                    pass
                pending_count = len([s for s in student_grouped if s["student_id"] not in acted_ids])
                _set_cache(cache_key_pending, pending_count)
        except Exception:
            pass

    result = {
        "metrics": {
            "total_logins": total_logins,
            "avg_time_on_task_min": round(avg_time, 1),
            "quiz_submissions": quiz_submissions,
            "active_students": active_students,
            "total_enrolled": total_enrolled,
            "risk_high": risk_high,
            "risk_medium": risk_medium,
            "risk_low": risk_low,
        },
        "trend": {
            "days": day_labels,
            "logins": logins_trend,
            "forum_posts": forum_trend,
            "quiz_submissions": quiz_trend,
            "avg_duration": dur_trend,
        },
        "pending_count": pending_count,
    }
    _set_cache(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# GET /engagement/trend
# ---------------------------------------------------------------------------
@app.get("/engagement/trend", response_model=EngagementTrendResponse)
def engagement_trend(days: int = 30, course_id: str | None = Query(default=None)):
    """Daily engagement counts for the trend chart."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        start = (_today() - timedelta(days=days)).isoformat()
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []

        day_labels = []
        logins = []
        forum = []
        quizzes = []
        avg_dur = []

        for i in range(days):
            d = (_today() - timedelta(days=days - 1 - i)).isoformat()
            day_labels.append(d)

            l = conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='login' AND event_date=? {cf}",
                [d] + p,
            ).fetchone()[0]
            logins.append(l)

            f = conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type IN ('forum_post','forum_reply') AND event_date=? {cf}",
                [d] + p,
            ).fetchone()[0]
            forum.append(f)

            q = conn.execute(
                f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' AND submitted_date=? {'AND course_id = ?' if cid else ''}",
                [d] + p,
            ).fetchone()[0]
            quizzes.append(q)

            dur = conn.execute(
                f"SELECT COALESCE(AVG(duration_min), 0) FROM engagement_logs WHERE event_type='login' AND event_date=? {cf}",
                [d] + p,
            ).fetchone()[0]
            avg_dur.append(round(dur, 1))

    return {
        "days": day_labels,
        "logins": logins,
        "forum_posts": forum,
        "quiz_submissions": quizzes,
        "avg_duration": avg_dur,
    }


# ---------------------------------------------------------------------------
# GET /engagement/weekly
# ---------------------------------------------------------------------------
@app.get("/engagement/weekly", response_model=EngagementWeeklyResponse)
def engagement_weekly(weeks: int = 7, course_id: str | None = Query(default=None)):
    """Weekly activity breakdown for the bar chart."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []

        week_labels = []
        quiz_data = []
        forum_data = []
        resource_data = []

        for w in range(weeks):
            week_end = _today() - timedelta(weeks=weeks - 1 - w)
            week_start = week_end - timedelta(days=6)
            label = f"{week_start.day} {week_start.strftime('%b')}–{week_end.day} {week_end.strftime('%b')}"
            week_labels.append(label)

            ws = week_start.isoformat()
            we = week_end.isoformat()

            q = conn.execute(
                f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' AND submitted_date>=? AND submitted_date<=? {'AND course_id = ?' if cid else ''}",
                [ws, we] + p,
            ).fetchone()[0]
            quiz_data.append(q)

            f = conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type IN ('forum_post','forum_reply') AND event_date>=? AND event_date<=? {cf}",
                [ws, we] + p,
            ).fetchone()[0]
            forum_data.append(f)

            r = conn.execute(
                f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='resource_view' AND event_date>=? AND event_date<=? {cf}",
                [ws, we] + p,
            ).fetchone()[0]
            resource_data.append(r)

    return {
        "weeks": week_labels,
        "quiz_submissions": quiz_data,
        "forum_posts": forum_data,
        "resource_views": resource_data,
    }


# ---------------------------------------------------------------------------
# GET /engagement/categories
# ---------------------------------------------------------------------------
@app.get("/engagement/categories", response_model=EngagementCategoriesResponse)
def engagement_categories(course_id: str | None = Query(default=None)):
    """Engagement totals by category for the pie chart."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        window = (_today() - timedelta(days=30)).isoformat()
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []

        logins = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='login' AND event_date>=? {cf}",
            [window] + p,
        ).fetchone()[0]

        quizzes = conn.execute(
            f"SELECT COUNT(*) FROM assessments WHERE assessment_type='quiz' {'AND course_id = ?' if cid else ''}",
            p,
        ).fetchone()[0]

        forums = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type IN ('forum_post','forum_reply') AND event_date>=? {cf}",
            [window] + p,
        ).fetchone()[0]

        resources = conn.execute(
            f"SELECT COUNT(*) FROM engagement_logs WHERE event_type='resource_view' AND event_date>=? {cf}",
            [window] + p,
        ).fetchone()[0]

        total = logins + quizzes + forums + resources or 1

    return {
        "total": total,
        "categories": [
            {"name": "Logins", "value": logins, "percent": round(logins / total * 100)},
            {"name": "Quiz Submissions", "value": quizzes, "percent": round(quizzes / total * 100)},
            {"name": "Forum Posts", "value": forums, "percent": round(forums / total * 100)},
            {"name": "Resource Views", "value": resources, "percent": round(resources / total * 100)},
        ],
    }


# ---------------------------------------------------------------------------
# GET /students
# ---------------------------------------------------------------------------
@app.get("/students", response_model=StudentsResponse)
def list_students(course_id: str | None = Query(default=None)):
    """All students with computed risk and engagement stats for the data grid."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        risks = compute_all_risks(conn, cid)

        # Batch-fetch 30-day login trends for all students in one query
        window_start = (_today() - timedelta(days=29)).isoformat()
        window_end = _today().isoformat()
        if cid:
            trend_rows = conn.execute(
                "SELECT student_id, event_date, COUNT(*) as cnt "
                "FROM engagement_logs "
                "WHERE event_type='login' AND event_date>=? AND event_date<=? AND course_id=? "
                "GROUP BY student_id, event_date",
                (window_start, window_end, cid),
            ).fetchall()
        else:
            trend_rows = conn.execute(
                "SELECT student_id, event_date, COUNT(*) as cnt "
                "FROM engagement_logs "
                "WHERE event_type='login' AND event_date>=? AND event_date<=? "
                "GROUP BY student_id, event_date",
                (window_start, window_end),
            ).fetchall()

        # Build lookup: {student_id: {date_str: count}}
        trend_map = {}
        for row in trend_rows:
            trend_map.setdefault(row["student_id"], {})[row["event_date"]] = row["cnt"]

        # Generate date list once
        date_list = [(_today() - timedelta(days=29 - i)).isoformat() for i in range(30)]

        result = []
        for r in risks:
            sid = r["student_id"]
            f = r["factors"]
            student_trends = trend_map.get(sid, {})
            trend = [student_trends.get(d, 0) for d in date_list]

            result.append({
                "id": sid,
                "studentName": r["student_name"],
                "riskLevel": r["risk_level"],
                "riskScore": r["risk_score"],
                "logins": f["login_count"],
                "avgTimeOnTask": f"{f['avg_duration_min']} min",
                "forumPosts": f["forum_posts"],
                "quizAvg": f["quiz_avg"],
                "activityTrend": trend,
            })

    return {"students": result}


# ---------------------------------------------------------------------------
# GET /risk
# ---------------------------------------------------------------------------
@app.get("/risk", response_model=RiskResponse)
def at_risk_students(course_id: str | None = Query(default=None)):
    """Students flagged as at-risk (Medium or High)."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        risks = compute_all_risks(conn, cid)
        at_risk = [r for r in risks if r["risk_level"] in ("High", "Medium")]
        at_risk.sort(key=lambda x: -x["risk_score"])

        students = []
        for r in at_risk:
            f = r["factors"]
            students.append({
                "id": r["student_id"],
                "name": r["student_name"],
                "risk_level": r["risk_level"],
                "risk_score": r["risk_score"],
                "logins_30d": f["login_count"],
                "avg_time_on_task_min": f["avg_duration_min"],
                "forum_posts": f["forum_posts"],
                "quiz_avg": f["quiz_avg"],
                "days_inactive": f["days_inactive"],
            })

    high_count = sum(1 for s in students if s["risk_level"] == "High")
    return {
        "students": students,
        "total_at_risk": len(students),
        "high_risk_count": high_count,
        "threshold_note": "Rule-based scoring: login frequency (30%), time-on-task (25%), quiz performance (20%), forum activity (15%), recency (10%)",
    }


# ---------------------------------------------------------------------------
# GET /assessments
# ---------------------------------------------------------------------------
@app.get("/assessments", response_model=AssessmentsResponse)
def assessment_summary(course_id: str | None = Query(default=None)):
    """Assessment analytics for the assessments page."""
    cid = _parse_optional_int(course_id)
    with get_db() as conn:
        cf = "AND course_id = ?" if cid else ""
        p = [cid] if cid else []

        # Per-assessment-type stats
        types = conn.execute(
            f"SELECT assessment_type, COUNT(*) as count, AVG(score) as avg_score, MIN(score) as min_score, MAX(score) as max_score "
            f"FROM assessments WHERE 1=1 {cf.replace('AND', 'AND') if cf else ''} GROUP BY assessment_type",
            p,
        ).fetchall()

        type_stats = [
            {
                "type": row["assessment_type"],
                "count": row["count"],
                "avg_score": round(row["avg_score"], 1),
                "min_score": round(row["min_score"], 1),
                "max_score": round(row["max_score"], 1),
            }
            for row in types
        ]

        # Per-quiz title breakdown
        quizzes = conn.execute(
            f"SELECT title, COUNT(*) as attempts, AVG(score) as avg_score, "
            f"SUM(CASE WHEN score >= 50 THEN 1 ELSE 0 END) as pass_count "
            f"FROM assessments WHERE assessment_type='quiz' {cf} GROUP BY title ORDER BY title",
            p,
        ).fetchall()

        quiz_breakdown = [
            {
                "title": row["title"],
                "attempts": row["attempts"],
                "avg_score": round(row["avg_score"], 1),
                "pass_rate": round(row["pass_count"] / row["attempts"] * 100, 1) if row["attempts"] else 0,
            }
            for row in quizzes
        ]

        # Score distribution buckets
        buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        all_scores = conn.execute(
            f"SELECT score FROM assessments WHERE 1=1 {cf}",
            p,
        ).fetchall()
        for row in all_scores:
            s = row["score"]
            if s <= 20: buckets["0-20"] += 1
            elif s <= 40: buckets["21-40"] += 1
            elif s <= 60: buckets["41-60"] += 1
            elif s <= 80: buckets["61-80"] += 1
            else: buckets["81-100"] += 1

    return {
        "type_stats": type_stats,
        "quiz_breakdown": quiz_breakdown,
        "score_distribution": buckets,
    }


# ---------------------------------------------------------------------------
# GET /assessments/by-course — course-level quiz summaries for All Courses view
# ---------------------------------------------------------------------------
@app.get("/assessments/by-course")
def assessments_by_course():
    """Per-course quiz summary for the All Courses assessments view."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT c.id, c.code, c.name, "
            "COUNT(a.id) as quiz_count, "
            "ROUND(AVG(a.score), 1) as avg_score, "
            "MIN(a.score) as min_score, "
            "MAX(a.score) as max_score, "
            "ROUND(SUM(CASE WHEN a.score >= 50 THEN 1.0 ELSE 0.0 END) / COUNT(a.id) * 100, 1) as pass_rate, "
            "COUNT(DISTINCT a.student_id) as students_attempted, "
            "COUNT(DISTINCT CASE WHEN a.score < 50 THEN a.student_id END) as below_pass_count "
            "FROM courses c "
            "JOIN assessments a ON c.id = a.course_id AND a.assessment_type = 'quiz' "
            "GROUP BY c.id ORDER BY c.code"
        ).fetchall()

        courses = []
        for r in rows:
            courses.append({
                "course_id": r["id"],
                "code": r["code"],
                "name": r["name"],
                "quiz_count": r["quiz_count"],
                "avg_score": r["avg_score"],
                "min_score": round(r["min_score"], 1),
                "max_score": round(r["max_score"], 1),
                "pass_rate": r["pass_rate"],
                "students_attempted": r["students_attempted"],
                "below_pass_count": r["below_pass_count"],
                "score_range": round(r["max_score"] - r["min_score"], 1),
            })

        total_quizzes = sum(c["quiz_count"] for c in courses)
        overall_avg = round(sum(c["avg_score"] * c["quiz_count"] for c in courses) / total_quizzes, 1) if total_quizzes else 0

    return {
        "courses": courses,
        "total_quizzes": total_quizzes,
        "overall_avg": overall_avg,
    }


# ---------------------------------------------------------------------------
# GET /courses
# ---------------------------------------------------------------------------
@app.get("/courses", response_model=CoursesResponse)
def list_courses():
    """List all courses."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT c.id, c.code, c.name, c.semester, COUNT(e.student_id) as enrolled "
            "FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id "
            "GROUP BY c.id ORDER BY c.code"
        ).fetchall()
    return {"courses": [dict(r) for r in rows]}


# ---------------------------------------------------------------------------
# GET /predict/risk  ??single student ML prediction
# ---------------------------------------------------------------------------
@app.get("/predict/risk", response_model=SinglePredictionResponse)
def predict_risk(student_id: int, course_id: str | None = Query(default=None)):
    """Predict risk for a single student using the ML model (falls back to rule-based)."""
    cid = _parse_optional_int(course_id)
    model = load_model()
    with get_db() as conn:
        # Verify student exists
        student = conn.execute("SELECT id, name FROM students WHERE id=?", (student_id,)).fetchone()
        if not student:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
        pred = predict_student(conn, student_id, cid, model)
        pred["student_name"] = student["name"]
    return {"prediction": pred}


# ---------------------------------------------------------------------------
# GET /predict/batch  ??batch ML predictions
# ---------------------------------------------------------------------------
@app.get("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(course_id: str | None = Query(default=None)):
    """Predict risk for all students using the ML model (falls back to rule-based)."""
    cid = _parse_optional_int(course_id)
    model = load_model()
    with get_db() as conn:
        results = predict_all(conn, cid, model)
    method = "decision-tree" if model is not None else "rule-based"
    return {"predictions": results, "method": method, "total": len(results)}


# ---------------------------------------------------------------------------
# GET /model/info  ??model metadata and metrics
# ---------------------------------------------------------------------------
@app.get("/model/info", response_model=ModelInfoResponse)
def model_info():
    """Return rich model diagnostics including comparison and permutation importance."""
    return get_model_diagnostics()



# ---------------------------------------------------------------------------
# GET /clusters/students  ??k-means cluster assignments
# ---------------------------------------------------------------------------
@app.get("/clusters/students", response_model=ClustersResponse)
def get_clusters(course_id: str | None = Query(default=None), k: str | None = Query(default=None)):
    """Cluster students by engagement features. Auto-selects best k if not specified."""
    cid = _parse_optional_int(course_id)
    k_val = _parse_optional_int(k)
    try:
        result = cluster_students(course_id=cid, k=k_val)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ---------------------------------------------------------------------------
# GET /recommendations  ??student-level consolidated intervention queue
# ---------------------------------------------------------------------------
@app.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(course_id: str | None = Query(default=None), status: str | None = Query(default=None)):
    """Return one consolidated recommendation per student, sorted by urgency."""
    cid = _parse_optional_int(course_id)
    cache_key = f"recs:{cid}"

    # Regenerate and persist only if cache is stale
    cached_students = _cached(cache_key)
    if cached_students is None:
        with get_db() as conn:
            student_grouped, flat_recs = generate_all_recommendations(conn, cid)
            persist_recommendations(conn, flat_recs, cid)
            current_student_ids = {r["student_id"] for r in flat_recs}
            if current_student_ids:
                placeholders = ",".join("?" for _ in current_student_ids)
                conn.execute(
                    f"DELETE FROM recommendations WHERE rule_id='consolidated' AND status='pending' "
                    f"AND student_id NOT IN ({placeholders})",
                    list(current_student_ids),
                )
            else:
                conn.execute(
                    "DELETE FROM recommendations WHERE rule_id='consolidated' AND status='pending'"
                )
        _set_cache(cache_key, student_grouped)
        cached_students = student_grouped

    # Read DB rows for ids and statuses
    with get_db() as conn:
        # Get status for all consolidated recs (regardless of course_id stored)
        # because recs may have been persisted with course_id=NULL from All Courses
        sql = (
            "SELECT r.id, r.student_id, r.status FROM recommendations r "
            "WHERE r.rule_id = 'consolidated'"
        )
        rows = conn.execute(sql).fetchall()
        db_map = {r["student_id"]: {"rec_id": r["id"], "status": r["status"]} for r in rows}

    # Enrich cached students with DB id and status
    for s in cached_students:
        db_rec = db_map.get(s["student_id"])
        if db_rec:
            s["rec_id"] = db_rec["rec_id"]
            s["status"] = db_rec["status"]
        else:
            s["rec_id"] = None
            s["status"] = "pending"

    # Filter by status if requested
    filtered = cached_students
    if status and status.strip():
        filtered = [s for s in cached_students if s.get("status") == status.strip()]

    # Build items for the recommendations array
    items = []
    for s in filtered:
        items.append({
            "id": s.get("rec_id"),
            "student_id": s["student_id"],
            "student_name": s["student_name"],
            "rule_id": "consolidated",
            "priority": s.get("priority", "medium"),
            "title": s.get("action", ""),
            "explanation": s.get("reason", ""),
            "status": s.get("status", "pending"),
            "created_date": None,
            "updated_date": None,
        })

    return {
        "recommendations": items,
        "total": len(items),
        "students": filtered,
        "students_with_recs": len(filtered),
    }


# ---------------------------------------------------------------------------
# PATCH /recommendations/{rec_id}  ??update recommendation status
# ---------------------------------------------------------------------------
@app.patch("/recommendations/{rec_id}")
def patch_recommendation(rec_id: int, body: StatusUpdateRequest):
    """Update the status of a recommendation (acted, dismissed, saved, pending)."""
    if body.status not in ("pending", "acted", "dismissed", "saved"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM recommendations WHERE id=?", (rec_id,)).fetchone()
        if not existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
        update_recommendation_status(conn, rec_id, body.status)
    _invalidate_cache("recs:")
    return {"id": rec_id, "status": body.status}


# ---------------------------------------------------------------------------
# Notifications endpoints
# ---------------------------------------------------------------------------
class NotificationItem(BaseModel):
    id: int
    title: str
    body: str
    severity: str
    is_read: bool
    created_date: str

def _ensure_notifications_table(conn):
    """Ensure the notifications table exists with the correct schema.

    If the table exists but has a stale schema (e.g. missing 'title' column),
    drop and recreate it so endpoints don't crash.
    """
    # Check if table exists at all
    exists = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
    ).fetchone()
    if exists:
        # Verify schema has the 'title' column
        cols = [row[1] for row in conn.execute("PRAGMA table_info(notifications)").fetchall()]
        if "title" not in cols:
            conn.execute("DROP TABLE notifications")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'action',
            is_read INTEGER NOT NULL DEFAULT 0,
            created_date TEXT NOT NULL
        )
    """)


@app.get("/notifications")
def list_notifications(course_id: str | None = Query(default=None)):
    """List recent notifications."""
    cid = _parse_optional_int(course_id)
    cache_key = f"notif:{cid}"

    with get_db() as conn:
        _ensure_notifications_table(conn)
        # Only regenerate if cache is stale
        if _cached(cache_key) is None:
            _generate_notifications(conn, cid)
            _set_cache(cache_key, True)
        rows = conn.execute(
            "SELECT id, title, body, severity, is_read, created_date FROM notifications ORDER BY created_date DESC, id DESC LIMIT 50"
        ).fetchall()
        items = []
        unread = 0
        for r in rows:
            d = dict(r)
            if not d.get("is_read", 0):
                unread += 1
            items.append(d)
        return {"notifications": items, "unread_count": unread}

@app.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int):
    """Mark a notification as read."""
    with get_db() as conn:
        _ensure_notifications_table(conn)
        conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
        return {"id": notif_id, "is_read": True}

@app.post("/notifications/read-all")
def mark_all_notifications_read():
    """Mark all notifications as read."""
    with get_db() as conn:
        _ensure_notifications_table(conn)
        conn.execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0")
        return {"status": "ok"}

def _generate_notifications(conn, course_id=None):
    """Build a short instructor alert queue (max 3 items).

    Each alert = what happened + why it matters + what to do.
    Severity values: 'urgent', 'action', 'positive' (mapped to
    Urgent / Action Needed / Good News chips on the frontend).
    """
    # Remember which titles the instructor already read
    try:
        read_titles = {
            row["title"]
            for row in conn.execute(
                "SELECT title FROM notifications WHERE is_read = 1"
            ).fetchall()
        }
    except Exception:
        read_titles = set()

    conn.execute("DELETE FROM notifications")

    today = _today().isoformat()
    alerts: list[tuple[int, str, str, str, str]] = []  # (priority, title, body, severity, date)

    risks = compute_all_risks(conn, course_id)
    risk_map = {r["student_id"]: r for r in risks}

    # ---- 1. Pending interventions (highest priority) ---------------------
    # Count from generate_all_recommendations (read-only, no DB writes).
    # Subtract students who already have a non-pending DB status.
    pending_count = 0
    oldest_name = None
    oldest_date = today
    try:
        from recommendations import generate_all_recommendations
        student_grouped, _flat = generate_all_recommendations(conn, course_id)
        acted_ids = set()
        try:
            acted_rows = conn.execute(
                "SELECT DISTINCT student_id FROM recommendations "
                "WHERE rule_id='consolidated' AND status IN ('acted','dismissed','saved')"
            ).fetchall()
            acted_ids = {r["student_id"] for r in acted_rows}
        except Exception:
            pass
        pending_students = [s for s in student_grouped if s["student_id"] not in acted_ids]
        pending_count = len(pending_students)
        if pending_students:
            oldest_name = pending_students[-1]["student_name"]
            try:
                row = conn.execute(
                    "SELECT s.name, r.created_date FROM recommendations r "
                    "JOIN students s ON r.student_id = s.id "
                    "WHERE r.rule_id='consolidated' AND r.status='pending' "
                    "ORDER BY r.created_date ASC LIMIT 1"
                ).fetchone()
                if row:
                    oldest_name = row["name"]
                    oldest_date = row["created_date"]
            except Exception:
                pass
    except Exception:
        import traceback
        traceback.print_exc()

    if pending_count > 0:
        alerts.append((
            0,
            f"{pending_count} intervention{'s' if pending_count != 1 else ''} pending review",
            f"Oldest: {oldest_name} (since {oldest_date}). "
            f"Open the Intervention Queue to act on, dismiss, or save each one.",
            "urgent" if pending_count >= 5 else "action",
            today,
        ))

    # ---- 2. Newly detected high-risk students ---------------------------
    high_risk = [r for r in risks if r["risk_level"] == "High"]
    if high_risk:
        # Sort by risk score descending to show the worst cases
        high_risk.sort(key=lambda r: -r["risk_score"])
        top = high_risk[:3]
        names = ", ".join(r["student_name"] for r in top)
        extra = f" +{len(high_risk) - 3} more" if len(high_risk) > 3 else ""
        alerts.append((
            1,
            f"{len(high_risk)} student{'s' if len(high_risk) != 1 else ''} detected as high risk",
            f"{names}{extra}. "
            f"Review their profiles on the Students page and check Recommendations for suggested actions.",
            "urgent",
            today,
        ))

    # ---- 3. Students improved after intervention -------------------------
    try:
        acted_rows = conn.execute(
            "SELECT r.student_id, s.name "
            "FROM recommendations r JOIN students s ON r.student_id = s.id "
            "WHERE r.rule_id='consolidated' AND r.status='acted'"
        ).fetchall()
    except Exception:
        acted_rows = []

    improved = [row["name"] for row in acted_rows if risk_map.get(row["student_id"], {}).get("risk_level") == "Low"]
    if improved:
        names = ", ".join(improved[:3])
        extra = f" +{len(improved) - 3} more" if len(improved) > 3 else ""
        alerts.append((
            2,
            f"{len(improved)} student{'s' if len(improved) != 1 else ''} improved after your intervention",
            f"{names}{extra} moved to low risk. Your outreach is working.",
            "positive",
            today,
        ))

    # ---- Keep top 3, sorted by priority ----------------------------------
    alerts.sort(key=lambda a: a[0])
    for _, title, body, severity, d in alerts[:3]:
        already_read = 1 if title in read_titles else 0
        conn.execute(
            "INSERT INTO notifications (title, body, severity, is_read, created_date) VALUES (?, ?, ?, ?, ?)",
            (title, body, severity, already_read, d),
        )


# ---------------------------------------------------------------------------
# Profile endpoint (fixed demo instructor persona)
# ---------------------------------------------------------------------------
@app.get("/profile")
def get_profile():
    """Return the demo instructor profile."""
    return {
        "name": "Demo Instructor",
        "email": "instructor@example.edu",
        "role": "Instructor",
        "department": "Learning Analytics",
        "institution": "Demo University",
    }
