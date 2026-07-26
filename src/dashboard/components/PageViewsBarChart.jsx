import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';
import { fetchEngagementWeekly } from '../../api';
import { useCourse } from '../../CourseContext';
import useCourseData from '../../hooks/useCourseData';

export default function PageViewsBarChart() {
  const theme = useTheme();
  const { courseId } = useCourse();
  const { data: response } = useCourseData(courseId, fetchEngagementWeekly, 7);
  const data = response && {
    weeks: response.weeks,
    quizAttempts: response.quiz_submissions,
    forumPosts: response.forum_posts,
    resourceViews: response.resource_views,
  };

  if (!data) {
    return (
      <Card variant="outlined" sx={{ width: '100%' }}>
        <CardContent>
          <Typography component="h2" variant="subtitle2">Weekly Activity — 7 Weeks</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const total = data.quizAttempts.reduce((a, b) => a + b, 0)
    + data.forumPosts.reduce((a, b) => a + b, 0)
    + data.resourceViews.reduce((a, b) => a + b, 0);

  const colorPalette = [
    (theme.vars || theme).palette.primary.dark,
    (theme.vars || theme).palette.primary.main,
    (theme.vars || theme).palette.primary.light,
  ];

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Box>
            <Typography component="h2" variant="subtitle2">
              Weekly Activity — 7 Weeks
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Quiz attempts, forum posts, and resource views by week
            </Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>{total.toLocaleString()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>total</Typography>
          </Stack>
        </Stack>
        <BarChart
          borderRadius={8}
          colors={colorPalette}
          xAxis={[{ scaleType: 'band', categoryGapRatio: 0.5, data: data.weeks, height: 24 }]}
          yAxis={[{ width: 50 }]}
          series={[
            { id: 'quiz-attempts', label: 'Quiz Submissions', data: data.quizAttempts, stack: 'A' },
            { id: 'forum-posts', label: 'Forum Posts', data: data.forumPosts, stack: 'A' },
            { id: 'resource-views', label: 'Resource Views', data: data.resourceViews, stack: 'A' },
          ]}
          height={250}
          margin={{ left: 0, right: 0, top: 20, bottom: 0 }}
          grid={{ horizontal: true }}
          hideLegend
        />
      </CardContent>
    </Card>
  );
}
