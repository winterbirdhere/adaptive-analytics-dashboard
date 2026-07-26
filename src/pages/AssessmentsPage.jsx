import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

import { fetchAssessments, fetchAssessmentsByCourse } from '../api';
import { useCourse } from '../CourseContext';

/* ── Column definitions ──────────────────────────────────── */

const quizColumns = [
  { field: 'title', headerName: 'Quiz', flex: 1, minWidth: 120 },
  { field: 'attempts', headerName: 'Attempts', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 80 },
  { field: 'avg_score', headerName: 'Avg Score', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 85,
    valueFormatter: (value) => `${value}%` },
  { field: 'pass_rate', headerName: 'Pass Rate', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 85,
    valueFormatter: (value) => `${value}%` },
];

const courseColumns = [
  { field: 'code', headerName: 'Code', flex: 0.35, minWidth: 85 },
  { field: 'name', headerName: 'Course Name', flex: 1, minWidth: 140 },
  { field: 'students_attempted', headerName: 'Students', type: 'number', headerAlign: 'left', flex: 0.35, minWidth: 70 },
  { field: 'avg_score', headerName: 'Avg Score', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 90,
    renderCell: (params) => (
      <Chip
        size="small"
        label={`${params.value}%`}
        color={params.value >= 70 ? 'success' : params.value >= 50 ? 'warning' : 'error'}
      />
    ),
  },
  { field: 'pass_rate', headerName: 'Pass Rate', type: 'number', headerAlign: 'left', flex: 0.45, minWidth: 85,
    renderCell: (params) => (
      <Chip
        size="small"
        variant="outlined"
        label={`${params.value}%`}
        color={params.value >= 80 ? 'success' : params.value >= 60 ? 'warning' : 'error'}
      />
    ),
  },
  { field: 'below_pass_count', headerName: 'Students Failed', type: 'number', headerAlign: 'left', flex: 0.55, minWidth: 120 },
  { field: 'score_range', headerName: 'Spread', type: 'number', headerAlign: 'left', flex: 0.35, minWidth: 65,
    valueFormatter: (value) => `${value}pt` },
];

/* ── All Courses view ────────────────────────────────────── */

function AllCoursesView() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAssessmentsByCourse()
      .then((d) => { if (!cancelled) { setData(d); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <ErrorCard />;
  if (!data) return <LoadingCard />;

  const sorted = [...data.courses].sort((a, b) => b.avg_score - a.avg_score);
  const best = sorted[0];
  const lowestPass = [...data.courses].sort((a, b) => a.pass_rate - b.pass_rate)[0];
  const totalBelow = data.courses.reduce((s, c) => s + (c.below_pass_count || 0), 0);

  const chartScores = data.courses.map((c) => c.avg_score);
  const chartPassRates = data.courses.map((c) => c.pass_rate);
  const chartLabels = data.courses.map((c) => c.code);
  const courseRows = data.courses.map((c) => ({ id: c.course_id, ...c }));

  return (
    <>
      {/* Key takeaway cards */}
      <Grid container spacing={2} columns={12} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Overall Avg Score</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{data.overall_avg}%</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{data.courses.length} courses</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Highest Performing</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{best.avg_score}%</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{best.code} · {best.name}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Lowest Pass Rate</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{lowestPass.pass_rate}%</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{lowestPass.code} · {lowestPass.name}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Students with Scores Below 50%</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{totalBelow}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>across all courses</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart — full width */}
      <Card variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography variant="subtitle2" gutterBottom>Quiz Performance by Course</Typography>
          <BarChart
            borderRadius={6}
            xAxis={[{
              scaleType: 'band',
              data: chartLabels,
              tickLabelStyle: { fontSize: 14, fontWeight: 700 },
              height: 36,
            }]}
            yAxis={[{
              min: 0,
              max: 100,
              width: 56,
              tickInterval: [0, 25, 50, 75, 100],
              valueFormatter: (v) => `${v}%`,
            }]}
            series={[
              { data: chartScores, label: 'Avg Score', color: (theme.vars || theme).palette.primary.main },
              { data: chartPassRates, label: 'Pass Rate', color: (theme.vars || theme).palette.success.main },
            ]}
            height={300}
            margin={{ left: 12, right: 16, top: 24, bottom: 48 }}
            grid={{ horizontal: true }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mt: 0.5 }}>
            Dashed line = 50% pass threshold · Overall avg = {data.overall_avg}%
          </Typography>
        </CardContent>
      </Card>

      {/* Table — full width */}
      <Card variant="outlined">
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography variant="subtitle2" gutterBottom>Detailed Course Breakdown</Typography>
          <DataGrid
            rows={courseRows}
            columns={courseColumns}
            density="compact"
            pageSizeOptions={[10]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: {},
            }}
            disableColumnResize
          />
        </CardContent>
      </Card>
    </>
  );
}

/* ── Single Course view ──────────────────────────────────── */

function SingleCourseView({ courseId }) {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAssessments(courseId)
      .then((d) => { if (!cancelled) { setData(d); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [courseId]);

  if (error) return <ErrorCard />;
  if (!data) return <LoadingCard />;

  const quizRows = data.quiz_breakdown.map((q, i) => ({ id: i, ...q }));
  const distLabels = Object.keys(data.score_distribution);
  const distValues = Object.values(data.score_distribution);

  const quizStat = data.type_stats.find((t) => t.type === 'quiz');

  return (
    <>
      {quizStat && (
        <Grid container spacing={2} columns={12} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Quiz Submissions</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizStat.count}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Average Score</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizStat.avg_score}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Lowest Score</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizStat.min_score}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Highest Score</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>{quizStat.max_score}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2} columns={12}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Score Distribution</Typography>
              <BarChart
                borderRadius={8}
                colors={[(theme.vars || theme).palette.primary.main]}
                xAxis={[{ scaleType: 'band', data: distLabels }]}
                yAxis={[{ width: 56 }]}
                series={[{ data: distValues, label: 'Students' }]}
                height={240}
                margin={{ left: 8, right: 16, top: 20, bottom: 32 }}
                grid={{ horizontal: true }}
                hideLegend
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Quiz Breakdown</Typography>
              <DataGrid
                rows={quizRows}
                columns={quizColumns}
                density="compact"
                pageSizeOptions={[10]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableColumnResize
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

/* ── Shared helpers ──────────────────────────────────────── */

function ErrorCard() {
  return (
    <Card variant="outlined"><CardContent>
      <Typography sx={{ color: 'error.main' }}>
        Unable to load assessment data. Make sure the backend is running on port 8000.
      </Typography>
    </CardContent></Card>
  );
}

function LoadingCard() {
  return (
    <Card variant="outlined"><CardContent>
      <Typography sx={{ color: 'text.secondary' }}>Loading assessment data...</Typography>
    </CardContent></Card>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export default function AssessmentsPage() {
  const { courseId } = useCourse();

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 2 }}>
        <Typography component="h2" variant="h6">Assessments</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {courseId ? 'Quiz breakdown' : 'Course comparison'}
        </Typography>
      </Stack>
      {courseId ? <SingleCourseView courseId={courseId} /> : <AllCoursesView />}
    </Box>
  );
}
