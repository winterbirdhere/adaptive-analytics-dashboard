const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const fetchMetricsSummary = (courseId) =>
  apiFetch(`/metrics/summary${qs({ course_id: courseId })}`);

export const fetchDashboard = (courseId) =>
  apiFetch(`/dashboard${qs({ course_id: courseId })}`);

export const fetchEngagementTrend = (days = 30, courseId) =>
  apiFetch(`/engagement/trend${qs({ days, course_id: courseId })}`);

export const fetchEngagementWeekly = (weeks = 7, courseId) =>
  apiFetch(`/engagement/weekly${qs({ weeks, course_id: courseId })}`);

export const fetchEngagementCategories = (courseId) =>
  apiFetch(`/engagement/categories${qs({ course_id: courseId })}`);

export const fetchStudents = (courseId) =>
  apiFetch(`/students${qs({ course_id: courseId })}`);

export const fetchAtRiskStudents = (courseId) =>
  apiFetch(`/risk${qs({ course_id: courseId })}`);

export const fetchAssessments = (courseId) =>
  apiFetch(`/assessments${qs({ course_id: courseId })}`);

export const fetchAssessmentsByCourse = () =>
  apiFetch('/assessments/by-course');

export const fetchCourses = () => apiFetch('/courses');

export const fetchPrediction = (studentId, courseId) =>
  apiFetch(`/predict/risk${qs({ student_id: studentId, course_id: courseId })}`);

export const fetchBatchPredictions = (courseId) =>
  apiFetch(`/predict/batch${qs({ course_id: courseId })}`);

export const fetchModelInfo = () => apiFetch('/model/info');

export const fetchClusters = (courseId, k) =>
  apiFetch(`/clusters/students${qs({ course_id: courseId, k })}`);

export const fetchRecommendations = (courseId, status) =>
  apiFetch(`/recommendations${qs({ course_id: courseId, status })}`);

export async function patchRecommendation(recId, status) {
  const res = await fetch(`${API_BASE}/recommendations/${recId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}


export const fetchNotifications = (courseId) =>
  apiFetch(`/notifications${qs({ course_id: courseId })}`);

export async function markNotificationRead(notifId) {
  const res = await fetch(`${API_BASE}/notifications/${notifId}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const fetchProfile = () => apiFetch('/profile');
