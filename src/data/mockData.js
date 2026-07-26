/**
 * Centralized mock/sample data for the Student Engagement Analytics Dashboard.
 * All components import from here instead of embedding hardcoded data.
 * This layer will be replaced by live API calls once the backend is fully wired.
 */

// --- Stat cards (MainGrid overview) ---

export const statCards = [
  {
    title: 'Total Logins',
    value: '1,247',
    interval: 'Last 30 days',
    trend: 'up',
    data: [
      30, 28, 35, 42, 38, 45, 40, 48, 44, 50,
      46, 52, 48, 55, 50, 58, 54, 60, 56, 62,
      58, 64, 60, 66, 62, 68, 64, 70, 66, 72,
    ],
  },
  {
    title: 'Avg Time-on-Task',
    value: '32 min',
    interval: 'Last 30 days',
    trend: 'down',
    data: [
      45, 42, 40, 38, 36, 35, 34, 33, 32, 31,
      30, 32, 31, 30, 29, 30, 31, 30, 29, 28,
      30, 29, 28, 30, 31, 30, 29, 28, 30, 32,
    ],
  },
  {
    title: 'Quiz Submissions',
    value: '856',
    interval: 'Last 30 days',
    trend: 'neutral',
    data: [
      25, 28, 30, 27, 32, 29, 31, 28, 30, 33,
      29, 31, 28, 30, 27, 32, 29, 31, 28, 30,
      33, 29, 31, 28, 30, 27, 32, 29, 31, 28,
    ],
  },
];

// --- Engagement trend chart (SessionsChart) ---

export const engagementTrend = {
  logins: [
    30, 35, 28, 42, 38, 45, 40, 48, 44, 50,
    46, 52, 48, 55, 50, 58, 54, 60, 56, 62,
    58, 64, 60, 66, 62, 68, 64, 70, 66, 72,
  ],
  forumPosts: [
    8, 12, 10, 15, 11, 14, 18, 13, 16, 20,
    15, 18, 22, 17, 20, 24, 19, 22, 26, 21,
    24, 28, 23, 26, 30, 25, 28, 32, 27, 30,
  ],
  quizSubmissions: [
    20, 25, 22, 28, 24, 30, 26, 32, 28, 34,
    30, 36, 32, 38, 34, 40, 36, 42, 38, 44,
    40, 46, 42, 48, 44, 50, 46, 52, 48, 54,
  ],
};

// --- Weekly activity breakdown (PageViewsBarChart) ---

export const weeklyActivity = {
  weeks: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'],
  quizAttempts: [120, 145, 132, 158, 141, 167, 155],
  forumPosts: [45, 52, 38, 61, 48, 55, 42],
  resourceViews: [210, 245, 198, 267, 232, 278, 251],
};

// --- Engagement by category (pie chart) ---

export const engagementByCategory = {
  pieData: [
    { label: 'Logins', value: 1247 },
    { label: 'Quiz Submissions', value: 856 },
    { label: 'Forum Posts', value: 423 },
    { label: 'Resource Views', value: 1680 },
  ],
  breakdown: [
    { name: 'Logins', value: 30, color: 'hsl(220, 25%, 65%)' },
    { name: 'Quiz Submissions', value: 20, color: 'hsl(220, 25%, 45%)' },
    { name: 'Forum Posts', value: 10, color: 'hsl(220, 25%, 30%)' },
    { name: 'Resource Views', value: 40, color: 'hsl(220, 25%, 20%)' },
  ],
};

// --- At high risk students table (DataGrid) ---

export const studentRows = [
  { id: 1, studentName: 'Alex Chen', riskLevel: 'High', logins: 3, avgTimeOnTask: '8 min', forumPosts: 0, quizAvg: 42, activityTrend: [1,1,0,0,2,1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0] },
  { id: 2, studentName: 'Maria Garcia', riskLevel: 'Low', logins: 28, avgTimeOnTask: '45 min', forumPosts: 12, quizAvg: 91, activityTrend: [5,6,5,7,6,5,6,7,5,6,7,6,5,7,6,5,6,7,5,6,7,6,5,7,6,5,6,7,5,6] },
  { id: 3, studentName: 'James Wilson', riskLevel: 'Medium', logins: 12, avgTimeOnTask: '22 min', forumPosts: 3, quizAvg: 65, activityTrend: [3,4,3,2,3,4,2,3,2,1,2,3,2,1,2,3,2,1,2,3,2,1,2,3,2,1,2,3,2,1] },
  { id: 4, studentName: 'Priya Patel', riskLevel: 'Low', logins: 26, avgTimeOnTask: '52 min', forumPosts: 18, quizAvg: 88, activityTrend: [6,5,7,6,5,7,6,5,7,6,5,7,6,5,7,6,5,7,6,5,7,6,5,7,6,5,7,6,5,7] },
  { id: 5, studentName: 'David Kim', riskLevel: 'High', logins: 5, avgTimeOnTask: '10 min', forumPosts: 1, quizAvg: 38, activityTrend: [2,1,1,0,1,0,0,1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0] },
  { id: 6, studentName: 'Sarah Johnson', riskLevel: 'Medium', logins: 15, avgTimeOnTask: '28 min', forumPosts: 5, quizAvg: 71, activityTrend: [4,3,4,3,2,3,4,3,2,3,4,3,2,3,4,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3] },
  { id: 7, studentName: 'Omar Hassan', riskLevel: 'Low', logins: 24, avgTimeOnTask: '40 min', forumPosts: 9, quizAvg: 85, activityTrend: [5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6] },
  { id: 8, studentName: 'Emily Brown', riskLevel: 'High', logins: 4, avgTimeOnTask: '12 min', forumPosts: 0, quizAvg: 35, activityTrend: [1,2,1,0,1,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0] },
  { id: 9, studentName: 'Lucas Martinez', riskLevel: 'Medium', logins: 14, avgTimeOnTask: '25 min', forumPosts: 4, quizAvg: 68, activityTrend: [3,3,4,3,2,3,3,2,3,2,3,3,2,3,2,3,3,2,3,2,3,3,2,3,2,3,3,2,3,2] },
  { id: 10, studentName: 'Aisha Rahman', riskLevel: 'Low', logins: 27, avgTimeOnTask: '48 min', forumPosts: 15, quizAvg: 93, activityTrend: [6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7,6,7] },
  { id: 11, studentName: 'Ryan Thompson', riskLevel: 'High', logins: 2, avgTimeOnTask: '5 min', forumPosts: 0, quizAvg: 28, activityTrend: [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  { id: 12, studentName: 'Sofia Rossi', riskLevel: 'Medium', logins: 16, avgTimeOnTask: '30 min', forumPosts: 6, quizAvg: 72, activityTrend: [4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3] },
  { id: 13, studentName: 'Wei Zhang', riskLevel: 'Low', logins: 25, avgTimeOnTask: '42 min', forumPosts: 11, quizAvg: 87, activityTrend: [5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6,5,6] },
  { id: 14, studentName: 'Fatima Ali', riskLevel: 'Medium', logins: 13, avgTimeOnTask: '20 min', forumPosts: 2, quizAvg: 62, activityTrend: [3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2,3,2] },
  { id: 15, studentName: 'Noah Davis', riskLevel: 'High', logins: 6, avgTimeOnTask: '14 min', forumPosts: 1, quizAvg: 45, activityTrend: [2,1,2,1,0,1,0,1,0,0,1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1] },
];
