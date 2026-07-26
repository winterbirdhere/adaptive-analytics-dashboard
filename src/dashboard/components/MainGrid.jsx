import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';

import ChartUserByCountry from './ChartUserByCountry';
import CustomizedDataGrid from './CustomizedDataGrid';
import SessionsChart from './SessionsChart';
import PageViewsBarChart from './PageViewsBarChart';
import StatCard from './StatCard';
import { fetchDashboard } from '../../api';
import { useCourse } from '../../CourseContext';
import useCourseData from '../../hooks/useCourseData';

const metricSx = {
  height: '100%',
  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  textAlign: 'center', py: 2, px: 1.5, '&:last-child': { pb: 2 },
};

export default function MainGrid() {
  const navigate = useNavigate();
  const { courseId } = useCourse();
  const { data, error } = useCourseData(courseId, fetchDashboard);

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Alert severity="warning">
          Dashboard data unavailable. Is the backend running?
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Typography sx={{ color: 'text.secondary' }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  const m = data.metrics;
  const trend = data.trend;
  const pendingCount = data.pending_count;

  const sparkData = [
    { title: 'Total Logins', value: m.total_logins.toLocaleString(), interval: 'Last 30 days', trend: 'up', data: trend.logins },
    { title: 'Avg Time-on-Task', value: `${m.avg_time_on_task_min} min`, interval: 'Last 30 days', trend: m.avg_time_on_task_min < 30 ? 'down' : 'neutral', data: trend.avg_duration, chartColor: '#5c9cf5' },
    { title: 'Quiz Submissions', value: m.quiz_submissions.toLocaleString(), interval: 'Last 30 days', trend: 'neutral', data: trend.quiz_submissions },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {/* ── Command Bar ── */}
      <Card
        variant="outlined"
        sx={(theme) => ({
          mb: 3,
          borderLeft: 4,
          borderLeftColor: theme.palette.mode === 'dark' ? '#C68A2D' : '#17324D',
        })}
      >
        <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, fontSize: '0.7rem' }}>
                {courseId ? 'Course Dashboard' : 'All Courses'}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {m.risk_high} student{m.risk_high !== 1 ? 's' : ''} need attention
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {pendingCount > 0
                  ? `${pendingCount} pending intervention${pendingCount !== 1 ? 's' : ''} awaiting review`
                  : 'No pending interventions'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => navigate('/recommendations')}
              sx={{ whiteSpace: 'nowrap', fontWeight: 700, px: 2, flexShrink: 0 }}
            >
              Review Recommendations
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Key Metrics ── */}
      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <WarningAmberRoundedIcon sx={{ fontSize: 24, color: 'error.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>High Risk</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{m.risk_high}</Typography>
              {m.risk_high > 0 && <Chip size="small" color="error" label="Urgent" sx={{ mt: 0.5 }} />}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <PendingActionsRoundedIcon sx={{ fontSize: 24, color: 'warning.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pending</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{pendingCount}</Typography>
              {pendingCount > 0 && <Chip size="small" color="warning" label="Review" sx={{ mt: 0.5 }} />}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <PeopleRoundedIcon sx={{ fontSize: 24, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Active / Enrolled</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{m.active_students}/{m.total_enrolled}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <QuizRoundedIcon sx={{ fontSize: 24, color: 'info.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Quiz Submissions</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{m.quiz_submissions}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── 30-Day Trends ── */}
      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        {sparkData.map((card, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* ── Engagement Analytics ── */}
      <Typography variant="h6" sx={{ mb: 2 }}>Engagement Analytics</Typography>
      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SessionsChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PageViewsBarChart />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* ── Student Roster ── */}
      <Typography variant="h6" sx={{ mb: 2 }}>Student Roster</Typography>
      <Grid container spacing={2} columns={24}>
        <Grid size={{ xs: 24, lg: 18 }}>
          <CustomizedDataGrid />
        </Grid>
        <Grid size={{ xs: 24, lg: 6 }}>
          <ChartUserByCountry />
        </Grid>
      </Grid>
    </Box>
  );
}
