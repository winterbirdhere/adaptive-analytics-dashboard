"""
Rule-based intervention recommendation engine.

Uses the canonical rule-based risk scores, cluster assignments (Phase 5),
and raw engagement features to generate ONE consolidated recommendation
per student. Multiple rule triggers are merged into a single action
with a combined explanation.

All rule conditions use canonical (rule-based) risk levels, not ML predictions.
The ML model is not used in the recommendation pipeline.
"""

from datetime import date
from database import get_db
from demo_config import today as demo_today
from ml_features import extract_features_for_student
from ml_model import load_model, predict_student
from clustering import cluster_students

# Each rule: (rule_id, priority, title, short_reason, condition_fn)
# condition_fn receives: features dict, prediction dict, cluster_label str
RULES = []


def _rule(rule_id, priority, title, short_reason):
    """Decorator to register a recommendation rule."""
    def decorator(fn):
        RULES.append((rule_id, priority, title, short_reason, fn))
        return fn
    return decorator


# --- High priority rules (only for clearly severe cases) ---

@_rule("high_risk_low_logins", "high", "Send engagement reminder",
       "{login_count} logins in 30 days")
def _r1(features, prediction, cluster_label):
    return features["risk_level"] == "High" and features["login_count"] < 8


@_rule("low_quiz_no_forum", "high", "Suggest study group or tutoring",
       "quiz avg {quiz_avg}%, {forum_posts} forum posts")
def _r2(features, prediction, cluster_label):
    return features["quiz_avg"] < 40 and features["forum_posts"] < 2 and features["risk_level"] != "Low"


@_rule("inactive_recently", "high", "Instructor check-in recommended",
       "inactive {days_inactive} days")
def _r3(features, prediction, cluster_label):
    return features["days_inactive"] >= 10


@_rule("at_risk_cluster", "high", "Prioritize intervention",
       "in '{cluster_label}' cluster with {login_count} logins")
def _r6(features, prediction, cluster_label):
    return cluster_label == "Low Engagement" and features["risk_level"] == "High"


# --- Medium priority rules (only when signal is strong) ---

@_rule("medium_risk_declining", "medium", "Monitor engagement trend",
       "{login_count} logins, quiz avg {quiz_avg}%")
def _r4(features, prediction, cluster_label):
    return features["risk_level"] == "Medium" and features["login_count"] < 12 and features["quiz_avg"] < 55


@_rule("passive_cluster_low_forum", "medium", "Encourage participation",
       "{forum_posts} forum posts, '{cluster_label}' cluster")
def _r5(features, prediction, cluster_label):
    return "Passive" in (cluster_label or "") and features["forum_posts"] < 2 and features["risk_level"] != "Low"


@_rule("low_time_on_task", "medium", "Review learning materials accessibility",
       "avg session {avg_duration_min} min")
def _r7(features, prediction, cluster_label):
    return features["avg_duration_min"] < 10 and features["login_count"] > 5 and features["risk_level"] != "Low"


# --- Consolidated action titles by priority ---
# When multiple rules fire, pick the best single action title.
# Priority order: high rules first, then by specificity.
_ACTION_PRIORITY = [
    "Instructor check-in recommended",
    "Send engagement reminder",
    "Prioritize intervention",
    "Suggest study group or tutoring",
    "Monitor engagement trend",
    "Encourage participation",
    "Review learning materials accessibility",
]


def _pick_action(triggered_rules):
    """Pick the single best action title from triggered rules."""
    for action in _ACTION_PRIORITY:
        for r in triggered_rules:
            if r["title"] == action:
                return action
    return triggered_rules[0]["title"]


def _build_reason(features, prediction, cluster_label):
    """Build a concise one-line reason summary from the student's data."""
    parts = []
    risk = features["risk_level"]  # canonical (rule-based) risk
    if risk == "High":
        parts.append("high risk")
    elif risk == "Medium":
        parts.append("medium risk")
    if features["login_count"] < 10:
        parts.append(f"only {features['login_count']} logins")
    if features["days_inactive"] >= 5:
        parts.append(f"inactive {features['days_inactive']}d")
    if features["quiz_avg"] < 50:
        parts.append(f"quiz avg {features['quiz_avg']:.0f}%")
    if features["forum_posts"] < 2:
        parts.append(f"{features['forum_posts']} forum posts")
    if features["avg_duration_min"] < 15 and features["login_count"] > 5:
        parts.append(f"avg session {features['avg_duration_min']:.0f} min")
    if cluster_label and ("Low Engagement" in cluster_label or "Passive" in cluster_label):
        parts.append(f"'{cluster_label}' group")
    return " · ".join(parts) if parts else f"{risk} risk"


def generate_all_recommendations(conn, course_id=None):
    """
    Generate ONE consolidated recommendation per student.
    Multiple rule triggers are merged into a single action + reason.
    Returns (student_list, flat_recs_for_persistence).
    Students are sorted by urgency (High first, then Medium).
    """
    if course_id:
        students = conn.execute(
            "SELECT DISTINCT s.id, s.name FROM students s "
            "JOIN enrollments e ON s.id = e.student_id "
            "WHERE e.course_id = ? ORDER BY s.name", (course_id,)
        ).fetchall()
    else:
        students = conn.execute("SELECT id, name FROM students ORDER BY name").fetchall()

    model = load_model()

    # Get cluster labels once
    cluster_map = {}
    try:
        clusters = cluster_students(course_id)
        for a in clusters["assignments"]:
            cluster_map[a["student_id"]] = a["cluster_label"]
    except Exception:
        pass

    student_recs = []
    flat_recs = []

    for s in students:
        features = extract_features_for_student(conn, s["id"], course_id)
        prediction = predict_student(conn, s["id"], course_id, model)
        cluster_label = cluster_map.get(s["id"])

        # Evaluate all rules ??use ML prediction for rule conditions,
        # but canonical (rule-based) risk_level for display
        triggered = []
        canonical_risk = features["risk_level"]  # rule-based = canonical
        for rule_id, priority, title, short_reason_tpl, condition_fn in RULES:
            if condition_fn(features, prediction, cluster_label):
                fmt_vals = {k: features[k] for k in features if k not in ("student_id", "risk_level", "risk_score")}
                fmt_vals["cluster_label"] = cluster_label or "Unknown"
                triggered.append({
                    "rule_id": rule_id,
                    "priority": priority,
                    "title": title,
                    "short_reason": short_reason_tpl.format(**fmt_vals),
                    "student_id": s["id"],
                    "student_name": s["name"],
                })

        if not triggered:
            continue

        # Determine consolidated priority (highest wins)
        has_high = any(r["priority"] == "high" for r in triggered)
        consolidated_priority = "high" if has_high else "medium"

        # Pick one best action
        action = _pick_action(triggered)

        # Build one concise reason from the student's actual data
        reason = _build_reason(features, prediction, cluster_label)

        risk = canonical_risk

        student_recs.append({
            "student_id": s["id"],
            "student_name": s["name"],
            "risk_level": risk,
            "risk_score": features["risk_score"],
            "cluster_label": cluster_label,
            "priority": consolidated_priority,
            "action": action,
            "reason": reason,
            "rules_triggered": len(triggered),
        })

        # For DB persistence, store the consolidated rec
        flat_recs.append({
            "rule_id": "consolidated",
            "priority": consolidated_priority,
            "title": action,
            "explanation": reason,
            "student_id": s["id"],
            "student_name": s["name"],
        })

    # Sort: High risk first, then Medium, then by risk_score descending
    risk_order = {"High": 0, "Medium": 1, "Low": 2}
    student_recs.sort(key=lambda s: (risk_order.get(s["risk_level"], 3), -s.get("risk_score", 0)))

    return student_recs, flat_recs


def persist_recommendations(conn, recs, course_id=None):
    """Save generated recommendations to the database (skip if any row exists for student)."""
    today = demo_today().isoformat()
    inserted = 0
    for r in recs:
        existing = conn.execute(
            "SELECT id FROM recommendations WHERE student_id=? AND rule_id=?",
            (r["student_id"], r["rule_id"]),
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO recommendations (student_id, course_id, rule_id, priority, title, explanation, created_date) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (r["student_id"], course_id, r["rule_id"], r["priority"], r["title"], r["explanation"], today),
            )
            inserted += 1
    return inserted


def update_recommendation_status(conn, rec_id, status):
    """Update the status of a recommendation."""
    today = demo_today().isoformat()
    conn.execute(
        "UPDATE recommendations SET status=?, updated_date=? WHERE id=?",
        (status, today, rec_id),
    )
