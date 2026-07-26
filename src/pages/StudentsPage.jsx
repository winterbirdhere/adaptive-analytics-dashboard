import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CustomizedDataGrid from '../dashboard/components/CustomizedDataGrid';

import { fetchMetricsSummary } from '../api';
import { useCourse } from '../CourseContext';
import useCourseData from '../hooks/useCourseData';

const cardSx = {
  py: 2, px: 2, '&:last-child': { pb: 2 },
  textAlign: 'center',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 80,
};

export default function StudentsPage() {
  const { courseId } = useCourse();
  const { data: summary, error: summaryError } = useCourseData(courseId, fetchMetricsSummary);

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        Student Roster &amp; Risk Overview
      </Typography>

      {summaryError && (
        <Alert severity="warning" sx={{ mb: 2 }}>Summary data unavailable — is the backend running?</Alert>
      )}

      {summary && (
        <Grid container spacing={2} columns={12} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={cardSx}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Enrolled</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>{summary.total_enrolled}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={cardSx}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>High Risk</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>{summary.risk_high}</Typography>
                <Chip size="small" color="error" label="Urgent" sx={{ mt: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={cardSx}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Medium Risk</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>{summary.risk_medium}</Typography>
                <Chip size="small" color="warning" label="Watch" sx={{ mt: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={cardSx}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Low Risk</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>{summary.risk_low}</Typography>
                <Chip size="small" color="success" label="Good" sx={{ mt: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <CustomizedDataGrid />
    </Box>
  );
}
