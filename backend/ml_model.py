"""
Decision tree risk prediction model with model comparison and diagnostics.

Trains multiple tree variants (shallow + deeper), computes permutation
importance alongside Gini importance, and provides rich evaluation metrics
including confusion matrix, per-class precision/recall/F1, and cross-validation.

The rule-based scorer remains as the baseline/fallback.

Usage:
  python ml_model.py          # Train, evaluate, and save model
  python ml_model.py --eval   # Evaluate only (load existing model)
"""

import os
import pickle
import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import (
    classification_report, accuracy_score, confusion_matrix,
)
from sklearn.inspection import permutation_importance
from ml_features import build_training_dataset, extract_features_for_student
from database import get_db

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
FEATURE_NAMES = ["login_count", "avg_duration_min", "forum_posts", "quiz_avg", "days_inactive"]
LABEL_MAP = {"Low": 0, "Medium": 1, "High": 2}
LABEL_NAMES = ["Low", "Medium", "High"]

# Threshold below which we flag the dataset as too small
SMALL_SAMPLE_THRESHOLD = 50


def _prepare_data(rows):
    """Convert list of dicts to numpy arrays."""
    X = np.array([[r[f] for f in FEATURE_NAMES] for r in rows], dtype=float)
    y = np.array([LABEL_MAP[r["risk_level"]] for r in rows], dtype=int)
    return X, y


def _evaluate_model(model, X, y, label="train"):
    """Compute metrics for a fitted model on given data."""
    y_pred = model.predict(X)
    acc = round(accuracy_score(y, y_pred) * 100, 1)
    report = classification_report(
        y, y_pred, target_names=LABEL_NAMES, output_dict=True, zero_division=0
    )
    cm = confusion_matrix(y, y_pred, labels=[0, 1, 2]).tolist()
    return {
        f"{label}_accuracy": acc,
        f"{label}_report": report,
        f"{label}_confusion_matrix": cm,
    }


def _compute_permutation_importance(model, X, y):
    """Permutation importance — more reliable than Gini for small datasets."""
    perm = permutation_importance(model, X, y, n_repeats=30, random_state=42, scoring="accuracy")
    return {
        FEATURE_NAMES[i]: {
            "mean": round(float(perm.importances_mean[i]), 4),
            "std": round(float(perm.importances_std[i]), 4),
        }
        for i in range(len(FEATURE_NAMES))
    }


def _train_single(X, y, max_depth, min_samples_leaf=2):
    """Train one decision tree variant and return (model, metrics_dict)."""
    model = DecisionTreeClassifier(
        max_depth=max_depth,
        min_samples_leaf=min_samples_leaf,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(X, y)

    metrics = _evaluate_model(model, X, y, "train")
    metrics["tree_rules"] = export_text(model, feature_names=FEATURE_NAMES)
    metrics["tree_depth"] = int(model.get_depth())
    metrics["n_leaves"] = int(model.get_n_leaves())
    metrics["max_depth_param"] = max_depth
    metrics["gini_importances"] = {
        FEATURE_NAMES[i]: round(float(v), 4)
        for i, v in enumerate(model.feature_importances_)
    }
    metrics["permutation_importances"] = _compute_permutation_importance(model, X, y)

    # Cross-validation (if enough samples per class)
    min_class_count = int(min(np.bincount(y)))
    n_splits = min(5, min_class_count)
    if n_splits >= 2:
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        y_pred_cv = cross_val_predict(model, X, y, cv=cv)
        metrics["cv_accuracy"] = round(accuracy_score(y, y_pred_cv) * 100, 1)
        metrics["cv_report"] = classification_report(
            y, y_pred_cv, target_names=LABEL_NAMES, output_dict=True, zero_division=0
        )
        metrics["cv_confusion_matrix"] = confusion_matrix(y, y_pred_cv, labels=[0, 1, 2]).tolist()
    else:
        metrics["cv_accuracy"] = None
        metrics["cv_report"] = None
        metrics["cv_confusion_matrix"] = None

    return model, metrics


def train_model(max_depth=4, min_samples_leaf=2):
    """
    Train two model variants and save the primary one.
    Returns (primary_model, comparison_dict).
    """
    rows = build_training_dataset()
    if len(rows) < 5:
        raise ValueError(f"Not enough data to train: {len(rows)} rows")

    X, y = _prepare_data(rows)
    n_samples = len(rows)
    class_dist = {LABEL_NAMES[i]: int(c) for i, c in enumerate(np.bincount(y))}

    # Variant A: shallow (interpretable, current default)
    model_a, metrics_a = _train_single(X, y, max_depth=max_depth, min_samples_leaf=min_samples_leaf)

    # Variant B: deeper (less constrained, may use more features)
    deeper_depth = min(max_depth + 3, n_samples // 3) or max_depth + 2
    model_b, metrics_b = _train_single(X, y, max_depth=deeper_depth, min_samples_leaf=1)

    # Save the primary (shallow) model
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_a, f)

    # Diagnostics
    warnings = []
    if n_samples < SMALL_SAMPLE_THRESHOLD:
        warnings.append(
            f"Small sample size ({n_samples} students). Model may be unstable. "
            f"Results should be interpreted with caution."
        )
    min_class = min(class_dist.values())
    if min_class <= 2:
        minority = [k for k, v in class_dist.items() if v <= 2]
        warnings.append(
            f"Severe class imbalance: {', '.join(minority)} class(es) have ≤2 samples. "
            f"Predictions for these classes are unreliable."
        )
    # Check if one feature dominates
    gini = metrics_a["gini_importances"]
    max_feat = max(gini, key=gini.get)
    if gini[max_feat] > 0.9:
        warnings.append(
            f"Feature '{max_feat}' dominates with {gini[max_feat]*100:.0f}% Gini importance. "
            f"The tree may be oversimplified. Check permutation importances for a second opinion."
        )

    result = {
        "n_samples": n_samples,
        "class_distribution": class_dist,
        "warnings": warnings,
        "primary": {
            "label": f"Shallow (max_depth={max_depth})",
            **metrics_a,
        },
        "comparison": {
            "label": f"Deeper (max_depth={deeper_depth})",
            **metrics_b,
        },
    }

    print(f"Primary model: {metrics_a['train_accuracy']}% train, {metrics_a.get('cv_accuracy')}% CV")
    print(f"Comparison model: {metrics_b['train_accuracy']}% train, {metrics_b.get('cv_accuracy')}% CV")
    print(f"Warnings: {warnings}")

    return model_a, result


def load_model():
    """Load saved model from disk. Returns None if not found."""
    if not os.path.exists(MODEL_PATH):
        return None
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def get_model_diagnostics():
    """
    Return rich diagnostics for the current model and a comparison variant.
    Called by the /model/info endpoint.
    """
    model = load_model()
    rows = build_training_dataset()
    if not rows:
        return {"available": False, "method": "rule-based"}

    X, y = _prepare_data(rows)
    n_samples = len(rows)
    class_dist = {LABEL_NAMES[i]: int(c) for i, c in enumerate(np.bincount(y))}

    warnings = []
    if n_samples < SMALL_SAMPLE_THRESHOLD:
        warnings.append(
            f"Small sample size ({n_samples} students). Model may be unstable."
        )
    min_class = min(class_dist.values())
    if min_class <= 2:
        minority = [k for k, v in class_dist.items() if v <= 2]
        warnings.append(
            f"Severe class imbalance: {', '.join(minority)} class(es) have ≤2 samples."
        )

    if model is None:
        return {
            "available": False,
            "method": "rule-based",
            "n_samples": n_samples,
            "class_distribution": class_dist,
            "warnings": warnings,
        }

    # Primary model metrics
    primary_metrics = _evaluate_model(model, X, y, "train")
    primary_metrics["tree_rules"] = export_text(model, feature_names=FEATURE_NAMES)
    primary_metrics["tree_depth"] = int(model.get_depth())
    primary_metrics["n_leaves"] = int(model.get_n_leaves())
    primary_metrics["gini_importances"] = {
        FEATURE_NAMES[i]: round(float(v), 4)
        for i, v in enumerate(model.feature_importances_)
    }
    primary_metrics["permutation_importances"] = _compute_permutation_importance(model, X, y)

    # CV for primary
    min_class_count = int(min(np.bincount(y)))
    n_splits = min(5, min_class_count)
    if n_splits >= 2:
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        y_pred_cv = cross_val_predict(model, X, y, cv=cv)
        primary_metrics["cv_accuracy"] = round(accuracy_score(y, y_pred_cv) * 100, 1)
        primary_metrics["cv_confusion_matrix"] = confusion_matrix(y, y_pred_cv, labels=[0, 1, 2]).tolist()
    else:
        primary_metrics["cv_accuracy"] = None
        primary_metrics["cv_confusion_matrix"] = None

    # Feature dominance check
    gini = primary_metrics["gini_importances"]
    max_feat = max(gini, key=gini.get)
    if gini[max_feat] > 0.9:
        warnings.append(
            f"Feature '{max_feat}' dominates ({gini[max_feat]*100:.0f}% Gini importance). "
            f"Tree may be oversimplified."
        )

    # Comparison: deeper tree
    deeper_depth = min(int(model.get_depth()) + 3, n_samples // 3) or int(model.get_depth()) + 2
    _, comparison_metrics = _train_single(X, y, max_depth=deeper_depth, min_samples_leaf=1)

    return {
        "available": True,
        "method": "decision-tree",
        "n_samples": n_samples,
        "class_distribution": class_dist,
        "warnings": warnings,
        "primary": {
            "label": f"Shallow (depth={int(model.get_depth())})",
            **primary_metrics,
        },
        "comparison": {
            "label": f"Deeper (max_depth={deeper_depth})",
            **comparison_metrics,
        },
    }


def predict_student(conn, student_id, course_id=None, model=None):
    """
    Predict risk for a single student using the ML model.
    Falls back to rule-based scoring if model is not available.
    """
    if model is None:
        model = load_model()

    features = extract_features_for_student(conn, student_id, course_id)

    if model is None:
        return {
            "student_id": student_id,
            "method": "rule-based",
            "risk_level": features["risk_level"],
            "risk_score": features["risk_score"],
            "confidence": None,
            "features": {f: features[f] for f in FEATURE_NAMES},
        }

    X = np.array([[features[f] for f in FEATURE_NAMES]], dtype=float)
    pred_idx = model.predict(X)[0]
    probas = model.predict_proba(X)[0]

    return {
        "student_id": student_id,
        "method": "decision-tree",
        "risk_level": LABEL_NAMES[pred_idx],
        "confidence": round(float(probas[pred_idx]) * 100, 1),
        "probabilities": {
            LABEL_NAMES[i]: round(float(p) * 100, 1)
            for i, p in enumerate(probas)
        },
        "features": {f: features[f] for f in FEATURE_NAMES},
        "rule_based_level": features["risk_level"],
        "rule_based_score": features["risk_score"],
    }


def predict_all(conn, course_id=None, model=None):
    """Predict risk for all students."""
    if model is None:
        model = load_model()

    if course_id:
        students = conn.execute(
            "SELECT DISTINCT s.id, s.name FROM students s "
            "JOIN enrollments e ON s.id = e.student_id "
            "WHERE e.course_id = ? ORDER BY s.name", (course_id,)
        ).fetchall()
    else:
        students = conn.execute(
            "SELECT id, name FROM students ORDER BY name"
        ).fetchall()

    results = []
    for s in students:
        pred = predict_student(conn, s["id"], course_id, model)
        pred["student_name"] = s["name"]
        results.append(pred)
    return results


if __name__ == "__main__":
    import sys
    if "--eval" in sys.argv:
        diag = get_model_diagnostics()
        import json
        print(json.dumps(diag, indent=2, default=str))
    else:
        model, result = train_model()
        import json
        print(json.dumps(result, indent=2, default=str))
