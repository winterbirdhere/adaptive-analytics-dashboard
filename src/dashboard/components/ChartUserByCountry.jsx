import PropTypes from 'prop-types';
import { PieChart } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { fetchEngagementCategories } from '../../api';
import { useCourse } from '../../CourseContext';
import useCourseData from '../../hooks/useCourseData';

const shortNames = {
  'Quiz Submissions': 'Quizzes',
  'Resource Views': 'Resources',
};

const iconMap = {
  Logins: <LoginRoundedIcon sx={{ fontSize: 16 }} />,
  'Quiz Submissions': <QuizRoundedIcon sx={{ fontSize: 16 }} />,
  'Forum Posts': <ForumRoundedIcon sx={{ fontSize: 16 }} />,
  'Resource Views': <MenuBookRoundedIcon sx={{ fontSize: 16 }} />,
};

const barColors = [
  'hsl(220, 25%, 65%)',
  'hsl(220, 25%, 45%)',
  'hsl(220, 25%, 30%)',
  'hsl(220, 25%, 20%)',
];

const pieColors = [
  'hsl(220, 20%, 65%)',
  'hsl(220, 20%, 42%)',
  'hsl(220, 20%, 35%)',
  'hsl(220, 20%, 25%)',
];

const StyledText = styled('text', {
  shouldForwardProp: (prop) => prop !== 'variant',
})(({ theme }) => ({
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fill: (theme.vars || theme).palette.text.secondary,
  variants: [
    {
      props: { variant: 'primary' },
      style: { fontSize: theme.typography.h5.fontSize, fontWeight: theme.typography.h5.fontWeight },
    },
    {
      props: ({ variant }) => variant !== 'primary',
      style: { fontSize: theme.typography.body2.fontSize, fontWeight: theme.typography.body2.fontWeight },
    },
  ],
}));

function PieCenterLabel({ primaryText, secondaryText }) {
  const { width, height, left, top } = useDrawingArea();
  const primaryY = top + height / 2 - 10;
  const secondaryY = primaryY + 24;

  return (
    <>
      <StyledText variant="primary" x={left + width / 2} y={primaryY}>
        {primaryText}
      </StyledText>
      <StyledText variant="secondary" x={left + width / 2} y={secondaryY}>
        {secondaryText}
      </StyledText>
    </>
  );
}

PieCenterLabel.propTypes = {
  primaryText: PropTypes.string.isRequired,
  secondaryText: PropTypes.string.isRequired,
};

function formatTotal(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function ChartUserByCountry() {
  const { courseId } = useCourse();
  const { data } = useCourseData(courseId, fetchEngagementCategories);
  const categories = data?.categories;

  if (!categories) {
    return (
      <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
        <CardContent>
          <Typography component="h2" variant="subtitle2">
            Engagement by Category
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const pieData = categories.map((category) => ({
    label: category.name,
    value: category.value,
  }));

  const categoryRows = categories.map((category, index) => ({
    name: category.name,
    value: category.percent,
    icon: iconMap[category.name] || <LoginRoundedIcon sx={{ fontSize: 16 }} />,
    color: barColors[index] || barColors[0],
  }));

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2">
          Engagement by Category
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <PieChart
            colors={pieColors}
            margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
            series={[
              {
                data: pieData,
                innerRadius: 60,
                outerRadius: 85,
                paddingAngle: 0,
                highlightScope: { fade: 'global', highlight: 'item' },
              },
            ]}
            height={190}
            width={190}
            hideLegend
          >
            <PieCenterLabel primaryText={formatTotal(data.total)} secondaryText="Total" />
          </PieChart>
        </Box>
        {categoryRows.map((category) => (
          <Stack key={category.name} direction="row" sx={{ alignItems: 'center', gap: 1, pb: 1 }}>
            {category.icon}
            <Stack sx={{ gap: 0.5, flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {shortNames[category.name] || category.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  {category.value}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                aria-label={`${category.name} engagement percentage`}
                value={category.value}
                sx={{ [`& .${linearProgressClasses.bar}`]: { backgroundColor: category.color } }}
              />
            </Stack>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}
