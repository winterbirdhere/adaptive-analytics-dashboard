"""
K-Means student clustering based on engagement features.

Uses 6 behavioral features, normalizes with StandardScaler, then
clusters with KMeans. Evaluates k=3..5 using silhouette score and
picks the best k automatically.

Cluster labels are assigned by sorting clusters on a composite
engagement score (logins + duration + forum + quiz - inactivity)
so the naming reflects behavioral patterns, not risk levels.
"""

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from ml_features import build_training_dataset
from database import get_db

FEATURE_NAMES = [
    "login_count",
    "avg_duration_min",
    "forum_posts",
    "quiz_avg",
    "days_inactive",
    "resource_views",
]

# Labels ordered from highest engagement to lowest
CLUSTER_LABELS = {
    3: ["Highly Engaged", "Steady Learners", "At-Risk Disengaged"],
    4: ["Highly Engaged", "Steady Learners", "Passive Learners", "At-Risk Disengaged"],
    5: ["Highly Engaged", "Active Learners", "Steady Learners", "Passive Learners", "At-Risk Disengaged"],
}


def _build_feature_matrix(course_id=None):
    """Build normalized feature matrix. Returns (X_scaled, scaler, rows).

    Adds resource_views from the engagement_logs table to the feature
    set produced by ml_features.build_training_dataset.
    """
    rows = build_training_dataset(course_id)
    if len(rows) < 5:
        raise ValueError(f"Not enough students to cluster: {len(rows)}")

    # Enrich rows with resource_views count (30-day window, matching risk_scoring logic)
    from demo_config import today as demo_today
    from datetime import timedelta
    as_of = demo_today().isoformat()
    window_start = (demo_today() - timedelta(days=30)).isoformat()

    with get_db() as conn:
        for row in rows:
            sid = row["student_id"]
            if course_id:
                rv = conn.execute(
                    "SELECT COUNT(*) FROM engagement_logs "
                    "WHERE student_id=? AND event_date>=? AND event_date<=? "
                    "AND event_type='resource_view' AND course_id=?",
                    (sid, window_start, as_of, course_id),
                ).fetchone()[0]
            else:
                rv = conn.execute(
                    "SELECT COUNT(*) FROM engagement_logs "
                    "WHERE student_id=? AND event_date>=? AND event_date<=? "
                    "AND event_type='resource_view'",
                    (sid, window_start, as_of),
                ).fetchone()[0]
            row["resource_views"] = rv

    X = np.array([[r[f] for f in FEATURE_NAMES] for r in rows], dtype=float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled, scaler, rows


def _engagement_score(row):
    """Composite engagement score for sorting clusters.

    Higher = more engaged. Uses raw feature values.
    """
    return (
        row["login_count"] * 1.0
        + row["avg_duration_min"] * 0.5
        + row["forum_posts"] * 2.0
        + row["quiz_avg"] * 0.3
        + row["resource_views"] * 0.8
        - row["days_inactive"] * 3.0
    )


def find_best_k(course_id=None, k_range=(3, 4, 5)):
    """Evaluate silhouette scores for each k and return results."""
    X_scaled, _, rows = _build_feature_matrix(course_id)
    n_samples = len(rows)

    results = []
    for k in k_range:
        if k >= n_samples:
            continue
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        results.append({"k": k, "silhouette": round(float(sil), 4)})

    return results


def cluster_students(course_id=None, k=None):
    """
    Cluster students and return assignments with labels.
    If k is None, picks the best k from silhouette evaluation.
    Returns dict with cluster assignments, summaries, and metadata.
    """
    X_scaled, scaler, rows = _build_feature_matrix(course_id)
    n_samples = len(rows)

    # Build student_id -> name map
    with get_db() as conn:
        name_rows = conn.execute("SELECT id, name FROM students").fetchall()
        name_map = {r["id"]: r["name"] for r in name_rows}

    # Pick best k if not specified
    if k is None:
        eval_results = find_best_k(course_id)
        if not eval_results:
            raise ValueError("Cannot determine k — not enough data")
        best = max(eval_results, key=lambda r: r["silhouette"])
        k = best["k"]

    if k >= n_samples:
        raise ValueError(f"k={k} must be less than n_samples={n_samples}")

    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(X_scaled)
    sil = silhouette_score(X_scaled, labels)

    # PCA for 2D scatter coordinates
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(X_scaled)

    # Sort clusters by mean engagement score (highest engagement = rank 0)
    cluster_eng_means = []
    for c in range(k):
        mask = labels == c
        mean_eng = np.mean([_engagement_score(rows[i]) for i in range(n_samples) if mask[i]])
        cluster_eng_means.append((c, mean_eng))
    cluster_eng_means.sort(key=lambda x: x[1], reverse=True)

    label_names = CLUSTER_LABELS.get(k, [f"Cluster {i}" for i in range(k)])
    rank_map = {}
    for rank, (orig_id, _) in enumerate(cluster_eng_means):
        rank_map[orig_id] = rank

    # Build per-cluster summaries
    summaries = {}
    for c in range(k):
        mask = labels == c
        indices = [i for i in range(n_samples) if mask[i]]
        rank = rank_map[c]
        name = label_names[rank]
        summary = {"cluster_id": rank, "label": name, "count": len(indices)}
        for f in FEATURE_NAMES:
            vals = [rows[i][f] for i in indices]
            summary[f"avg_{f}"] = round(float(np.mean(vals)), 1)
        summaries[rank] = summary

    # Build student assignments
    assignments = []
    for i, row in enumerate(rows):
        rank = rank_map[labels[i]]
        assignments.append({
            "student_id": row["student_id"],
            "student_name": name_map.get(row["student_id"], f"Student {row['student_id']}"),
            "cluster_id": rank,
            "cluster_label": label_names[rank],
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]), 3),
            "features": {f: row[f] for f in FEATURE_NAMES},
            "risk_level": row["risk_level"],
        })

    return {
        "k": k,
        "silhouette_score": round(float(sil), 4),
        "pca_explained_variance": [round(float(v), 4) for v in pca.explained_variance_ratio_],
        "summaries": [summaries[r] for r in sorted(summaries)],
        "assignments": assignments,
    }


if __name__ == "__main__":
    result = cluster_students()
    print(f"Best k: {result['k']}, Silhouette: {result['silhouette_score']}")
    print(f"PCA variance explained: {result['pca_explained_variance']}")
    for s in result["summaries"]:
        print(f"  {s['label']}: {s['count']} students, "
              f"avg logins={s['avg_login_count']}, avg quiz={s['avg_quiz_avg']}, "
              f"avg resources={s['avg_resource_views']}")
