"""
Seed the SQLite database with a large synthetic dataset.

120 students, 5 courses, ~16 weeks of engagement logs and assessments.
Covers Feb 12 – May 31, 2026 so the dashboard remains believable
whether opened on April 1 or any time through the end of semester.

Profile distribution is tuned to produce roughly balanced risk labels:
  ~35% Low, ~35% Medium, ~30% High
so the decision tree and clustering have meaningful class separation.

All data is synthetic and intended for prototype evaluation only.
"""

import random
from datetime import date, timedelta
from database import init_db, get_db

random.seed(42)

# ── Courses ──────────────────────────────────────────────────────────────
COURSES = [
    ("CS101", "Intro to Computer Science"),
    ("MATH201", "Calculus I"),
    ("PHYS101", "General Physics"),
    ("ENG102", "Academic Writing"),
    ("BIO110", "Intro to Biology"),
]

QUIZ_TITLES = {
    "CS101":   ["Variables & Types", "Control Flow", "Functions", "Data Structures", "Algorithms"],
    "MATH201": ["Limits", "Derivatives", "Integration", "Series", "Multivariable"],
    "PHYS101": ["Kinematics", "Forces", "Energy", "Waves", "Thermodynamics"],
    "ENG102":  ["Thesis Statements", "Argumentation", "Source Analysis", "Revision", "Style"],
    "BIO110":  ["Cell Biology", "Genetics", "Ecology", "Evolution", "Anatomy"],
}

FIRST_NAMES = [
    "Alex", "Maria", "James", "Priya", "David", "Sarah", "Omar", "Emily",
    "Lucas", "Aisha", "Ryan", "Sofia", "Wei", "Fatima", "Noah", "Yuki",
    "Carlos", "Hannah", "Ahmed", "Olivia", "Raj", "Chloe", "Daniel", "Lina",
    "Marcus", "Elena", "Tariq", "Megan", "Kenji", "Isabella", "Andre",
    "Nadia", "Ethan", "Zara", "Leo", "Amara", "Felix", "Jasmine", "Hugo",
    "Layla", "Oscar", "Rina", "Theo", "Sana", "Ivan", "Maya", "Axel",
    "Dina", "Kai", "Vera", "Ravi", "Tessa", "Jian", "Hana", "Mateo",
    "Freya", "Samir", "Lily", "Nico", "Anya",
]
LAST_NAMES = [
    "Chen", "Garcia", "Wilson", "Patel", "Kim", "Johnson", "Hassan", "Brown",
    "Martinez", "Rahman", "Thompson", "Rossi", "Zhang", "Ali", "Davis",
    "Tanaka", "Mendez", "Lee", "Nasser", "White", "Sharma", "Martin",
    "Park", "Johansson", "Taylor", "Nguyen", "Anderson", "Muller", "Santos",
    "Ivanov", "Okafor", "Dubois", "Yamamoto", "Singh", "Costa", "Petrov",
    "Larsson", "Morales", "Choi", "Fischer",
]

NUM_STUDENTS = 120
START_DATE = date(2026, 2, 12)   # Semester start (Thursday)
END_DATE = date(2026, 5, 31)     # Semester end (Sunday)
DAYS = (END_DATE - START_DATE).days + 1  # 109 days

# Key academic dates (day offsets from START_DATE)
MIDTERM_WEEK_START = 42   # ~week 7: Mar 26

# ── Engagement profiles ─────────────────────────────────────────────────
# (login_prob, avg_session_min, session_std, forum_prob, quiz_diligence, resource_prob)
PROFILES = {
    "high":        (0.92, 58, 10, 0.50, 0.95, 0.80),
    "high_mid":    (0.80, 44,  9, 0.32, 0.85, 0.62),
    "medium_high": (0.50, 25,  7, 0.10, 0.60, 0.32),
    "medium":      (0.32, 16,  6, 0.05, 0.45, 0.20),
    "medium_low":  (0.15,  9,  4, 0.015, 0.30, 0.08),
    "low":         (0.06,  4,  2, 0.005, 0.15, 0.03),
    "very_low":    (0.02,  2,  1, 0.001, 0.08, 0.01),
}

PROFILE_WEIGHTS = [
    ("high",        16),
    ("high_mid",    18),
    ("medium_high", 12),
    ("medium",      10),
    ("medium_low",  12),
    ("low",         18),
    ("very_low",    14),
]


def _day_activity_multiplier(day_offset):
    """Return a multiplier (0.0–1.0+) for how active a typical day is.

    Models: weekend dips, first-week ramp-up, midterm bump,
    and a slight end-of-semester decline.
    """
    d = START_DATE + timedelta(days=day_offset)
    dow = d.weekday()  # 0=Mon, 6=Sun

    # Weekend: 40-60% of weekday activity
    weekend_factor = 0.5 if dow >= 5 else 1.0

    # First week: gradual ramp from 60% to 100%
    if day_offset < 7:
        ramp = 0.6 + 0.4 * (day_offset / 6)
    else:
        ramp = 1.0

    # Midterm week: 15% activity boost
    if MIDTERM_WEEK_START <= day_offset < MIDTERM_WEEK_START + 7:
        exam_boost = 1.15
    # Week before midterm: slight increase
    elif MIDTERM_WEEK_START - 7 <= day_offset < MIDTERM_WEEK_START:
        exam_boost = 1.08
    else:
        exam_boost = 1.0

    # Late semester slight fatigue (last 2 weeks)
    if 84 <= day_offset < DAYS - 7:
        fatigue = 0.92
    else:
        fatigue = 1.0

    return weekend_factor * ramp * exam_boost * fatigue


def _generate_student_names(n):
    names = set()
    result = []
    attempts = 0
    while len(result) < n and attempts < n * 10:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        full = f"{first} {last}"
        if full not in names:
            names.add(full)
            email = f"{first.lower()}.{last.lower()}@university.edu"
            result.append((full, email))
        attempts += 1
    return result


def _assign_profiles(n):
    pool = []
    for profile, weight in PROFILE_WEIGHTS:
        pool.extend([profile] * weight)
    assignments = [pool[i % len(pool)] for i in range(n)]
    random.shuffle(assignments)
    return assignments


def seed():
    init_db()
    with get_db() as conn:
        for table in ["recommendations", "risk_flags", "assessments",
                      "engagement_logs", "enrollments", "students", "courses"]:
            conn.execute(f"DELETE FROM {table}")

        for code, name in COURSES:
            conn.execute("INSERT INTO courses (code, name) VALUES (?, ?)", (code, name))

        students = _generate_student_names(NUM_STUDENTS)
        for sname, email in students:
            conn.execute("INSERT INTO students (name, email) VALUES (?, ?)", (sname, email))

        course_ids = [r["id"] for r in conn.execute("SELECT id FROM courses").fetchall()]
        student_ids = [r["id"] for r in conn.execute("SELECT id FROM students").fetchall()]
        profiles = _assign_profiles(len(student_ids))

        for sid in student_ids:
            n_courses = random.choices([2, 3, 3, 4], weights=[20, 40, 30, 10])[0]
            n_courses = min(n_courses, len(course_ids))
            enrolled = random.sample(course_ids, n_courses)
            for cid in enrolled:
                conn.execute("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)", (sid, cid))

        enrollments = conn.execute("SELECT student_id, course_id FROM enrollments").fetchall()
        course_code_map = {r["id"]: r["code"] for r in conn.execute("SELECT id, code FROM courses").fetchall()}

        # ── Generate engagement logs and assessments ──
        for idx, sid in enumerate(student_ids):
            profile_name = profiles[idx]
            login_prob, avg_session, session_std, forum_prob, quiz_diligence, resource_prob = PROFILES[profile_name]
            student_courses = [e["course_id"] for e in enrollments if e["student_id"] == sid]

            # Per-student jitter
            jitter = random.uniform(-0.08, 0.08)
            login_p = max(0.02, min(0.98, login_prob + jitter))
            forum_p = max(0.0, min(0.6, forum_prob + jitter * 0.5))
            resource_p = max(0.02, min(0.9, resource_prob + jitter))
            quiz_d = max(0.1, min(0.98, quiz_diligence + jitter))

            # Some low-engagement students drop off partway through
            active_days = DAYS
            if profile_name == "very_low" and random.random() < 0.7:
                active_days = random.randint(DAYS // 5, DAYS // 3)
            elif profile_name == "low" and random.random() < 0.55:
                active_days = random.randint(DAYS // 4, DAYS // 2)
            elif profile_name == "medium_low" and random.random() < 0.3:
                active_days = random.randint(DAYS // 3, DAYS * 2 // 3)

            for cid in student_courses:
                code = course_code_map[cid]
                quiz_titles = QUIZ_TITLES.get(code, [])

                for day_offset in range(DAYS):
                    if day_offset >= active_days:
                        continue

                    d = START_DATE + timedelta(days=day_offset)
                    ds = d.isoformat()
                    mult = _day_activity_multiplier(day_offset)

                    # Login — probability scaled by day multiplier
                    if random.random() < login_p * mult:
                        duration = max(1, random.gauss(avg_session, session_std))
                        conn.execute(
                            "INSERT INTO engagement_logs (student_id, course_id, event_type, event_date, duration_min) VALUES (?,?,?,?,?)",
                            (sid, cid, "login", ds, round(duration, 1)),
                        )

                    # Forum posts
                    if random.random() < forum_p * mult:
                        conn.execute(
                            "INSERT INTO engagement_logs (student_id, course_id, event_type, event_date, duration_min) VALUES (?,?,?,?,?)",
                            (sid, cid, "forum_post", ds, round(random.uniform(2, 15), 1)),
                        )

                    # Resource views
                    if random.random() < resource_p * mult:
                        conn.execute(
                            "INSERT INTO engagement_logs (student_id, course_id, event_type, event_date, duration_min) VALUES (?,?,?,?,?)",
                            (sid, cid, "resource_view", ds, round(random.uniform(1, 20), 1)),
                        )

                # Quizzes — each quiz has a 7-day submission window
                # Courses are staggered so quiz activity is spread across the semester
                course_offset = course_ids.index(cid) * 3  # stagger by 3 days per course
                for qi, title in enumerate(quiz_titles):
                    # Quiz opens every ~2 weeks, offset per course
                    window_start_day = 7 + 14 * qi + course_offset
                    if window_start_day >= DAYS:
                        continue
                    window_end_day = min(window_start_day + 6, DAYS - 1)

                    # Skip if student dropped off before this quiz
                    if window_start_day >= active_days:
                        continue

                    # Pick a submission day within the window
                    submit_day = random.randint(window_start_day, window_end_day)
                    quiz_day = START_DATE + timedelta(days=submit_day)
                    base_score = random.gauss(75 * quiz_d + 20, 14)
                    score = max(0, min(100, round(base_score, 1)))
                    conn.execute(
                        "INSERT INTO assessments (student_id, course_id, assessment_type, title, score, max_score, submitted_date, attempt_number) VALUES (?,?,?,?,?,?,?,?)",
                        (sid, cid, "quiz", title, score, 100, quiz_day.isoformat(), 1),
                    )

                    # ~12% of diligent students retry once
                    if random.random() < quiz_d * 0.12 and submit_day < window_end_day:
                        retry_day = random.randint(submit_day + 1, window_end_day)
                        retry_date = START_DATE + timedelta(days=retry_day)
                        retry_score = max(0, min(100, round(random.gauss(80 * quiz_d + 15, 10), 1)))
                        conn.execute(
                            "INSERT INTO assessments (student_id, course_id, assessment_type, title, score, max_score, submitted_date, attempt_number) VALUES (?,?,?,?,?,?,?,?)",
                            (sid, cid, "quiz", title, retry_score, 100, retry_date.isoformat(), 2),
                        )

    print("Database seeded successfully.")


if __name__ == "__main__":
    seed()
    from database import get_db
    with get_db() as conn:
        for table in ["courses", "students", "enrollments", "engagement_logs", "assessments"]:
            count = conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            print(f"  {table}: {count} rows")

    from risk_scoring import compute_all_risks, persist_risks
    with get_db() as conn:
        risks = compute_all_risks(conn)
        persist_risks(conn)
        dist = {"Low": 0, "Medium": 0, "High": 0}
        for r in risks:
            dist[r["risk_level"]] += 1
        total = len(risks)
        print(f"\n  Risk distribution ({total} students):")
        for level in ["Low", "Medium", "High"]:
            pct = dist[level] / total * 100 if total else 0
            print(f"    {level}: {dist[level]} ({pct:.0f}%)")
    print("\nDone.")
