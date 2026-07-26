import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { LineChart } from '@mui/x-charts/LineChart';
import { fetchEngagementTrend } from '../../api';
import { useCourse } from '../../CourseContext';
import useCourseData from '../../hooks/useCourseData';

function AreaGradient({ color, id }) {
  return (
    <defs>
      <linearGradient id={id} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

AreaGradient.propTypes = {
  color: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
};

export default function SessionsChart() {
  const theme = useTheme();
  const { courseId } = useCourse();
  const { data: response } = useCourseData(courseId, fetchEngagementTrend, 30);
  const data = response && {
    days: response.days.map((day) => {
      const date = new Date(day);
      return `${date.getDate()} ${date.toLocaleDateString('en-GB', { month: 'short' })}`;
    }),
    logins: response.logins,
    forum: response.forum_posts,
    quizzes: response.quiz_submissions,
  };

  if (!data) {
    return (
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent>
          <Typography component="h2" variant="subtitle2">Daily Engagement — 30 Days</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const total = data.logins.reduce((a, b) => a + b, 0)
    + data.forum.reduce((a, b) => a + b, 0)
    + data.quizzes.reduce((a, b) => a + b, 0);

  const colorPalette = [
    theme.palette.primary.light,
    theme.palette.primary.main,
    theme.palette.primary.dark,
  ];

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Box>
            <Typography component="h2" variant="subtitle2">
              Daily Engagement — 30 Days
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Logins, forum posts, and quiz submissions stacked by day
            </Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>{total.toLocaleString()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>total</Typography>
          </Stack>
        </Stack>
        <LineChart
          colors={colorPalette}
          xAxis={[{ scaleType: 'point', data: data.days, tickInterval: (index, i) => (i + 1) % 5 === 0, height: 24 }]}
          yAxis={[{ width: 50 }]}
          series={[
            { id: 'logins', label: 'Logins', showMark: false, curve: 'linear', stack: 'total', area: true, stackOrder: 'ascending', data: data.logins },
            { id: 'forum', label: 'Forum Posts', showMark: false, curve: 'linear', stack: 'total', area: true, stackOrder: 'ascending', data: data.forum },
            { id: 'quizzes', label: 'Quiz Submissions', showMark: false, curve: 'linear', stack: 'total', stackOrder: 'ascending', data: data.quizzes, area: true },
          ]}
          height={250}
          margin={{ left: 0, right: 20, top: 20, bottom: 0 }}
          grid={{ horizontal: true }}
          sx={{
            '& .MuiAreaElement-series-quizzes': { fill: "url('#quizzes')" },
            '& .MuiAreaElement-series-forum': { fill: "url('#forum')" },
            '& .MuiAreaElement-series-logins': { fill: "url('#logins')" },
          }}
          hideLegend
        >
          <AreaGradient color={theme.palette.primary.dark} id="quizzes" />
          <AreaGradient color={theme.palette.primary.main} id="forum" />
          <AreaGradient color={theme.palette.primary.light} id="logins" />
        </LineChart>
      </CardContent>
    </Card>
  );
}
