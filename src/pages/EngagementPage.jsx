import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import SessionsChart from '../dashboard/components/SessionsChart';
import PageViewsBarChart from '../dashboard/components/PageViewsBarChart';
import ChartUserByCountry from '../dashboard/components/ChartUserByCountry';

import { fetchMetricsSummary } from '../api';
import { useCourse } from '../CourseContext';

/* Shared card content style for consistent height/alignment */
const cardSx = {
  py: 2, px: 2, '&:last-child': { pb: 2 },
  textAlign: 'center',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 80,
};

export default function EngagementPage() {
  const { courseId } = useCourse();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    fetchMetricsSummary(courseId)
      .then((d) => { setSummary(d); setSummaryError(false); })
      .catch(() => setSummaryError(true));
  }, [courseId]);

  const cards = summary
    ? [
        { label: 'Active Students (30d)', value: `${summary.active_students} / ${summary.total_enrolled}`, tooltip: 'Students with at least one activity in the last 30 days, out of total enrolled' },
        { label: 'Total Logins', value: summary.total_logins },
        { label: 'Forum Posts', value: summary.forum_posts },
        { label: 'High Risk', value: summary.risk_high, color: summary.risk_high > 0 ? 'error' : 'success', chip: 'Urgent', tooltip: 'Canonical risk: students scored High by the rule-based engine' },
        { label: 'Medium Risk', value: summary.risk_medium, color: summary.risk_medium > 0 ? 'warning' : 'success', chip: 'Watch', tooltip: 'Canonical risk: students scored Medium by the rule-based engine' },
      ]
    : null;

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        Engagement Analytics
      </Typography>

      {summaryError && (
        <Alert severity="warning" sx={{ mb: 2 }}>Summary data unavailable — is the backend running?</Alert>
      )}

      {cards && (
        <Grid container spacing={2} columns={10} sx={{ mb: 2 }}>
          {cards.map((c) => (
            <Grid key={c.label} size={{ xs: 5, sm: 2 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={cardSx}>
                  <Tooltip title={c.tooltip || ''} placement="top" arrow>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>{c.label}</Typography>
                  </Tooltip>
                  <Typography variant="h5" sx={{ mt: 0.5, whiteSpace: 'nowrap' }}>{c.value}</Typography>
                  {c.color && <Chip size="small" color={c.color} label={c.chip} sx={{ mt: 0.5 }} />}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2} columns={12}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SessionsChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PageViewsBarChart />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartUserByCountry />
        </Grid>
      </Grid>
    </Box>
  );
}
