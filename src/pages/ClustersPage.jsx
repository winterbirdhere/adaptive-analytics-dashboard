import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { ScatterChart } from '@mui/x-charts/ScatterChart';
import { DataGrid } from '@mui/x-data-grid';

import { fetchClusters } from '../api';
import { useCourse } from '../CourseContext';

const CLUSTER_COLORS = ['#2e7d32', '#ed6c02', '#d32f2f', '#1565c0', '#7b1fa2'];
const clusterChipSx = (id) => ({
  backgroundColor: `${CLUSTER_COLORS[id % CLUSTER_COLORS.length]} !important`,
  borderColor: `${CLUSTER_COLORS[id % CLUSTER_COLORS.length]} !important`,
  [`& .MuiChip-label`]: { color: '#fff !important', fontWeight: 600 },
});

const columns = [
  { field: 'student_name', headerName: 'Student', flex: 0.8, minWidth: 100 },
  {
    field: 'cluster_label', headerName: 'Cluster', flex: 1, minWidth: 150,
    valueGetter: (value, row) => row.cluster_id,
    renderCell: (params) => (
      <Chip size="small" label={params.row.cluster_label} sx={clusterChipSx(params.row.cluster_id)} />
    ),
  },
  { field: 'login_count', headerName: 'Logins', type: 'number', flex: 0.5, minWidth: 65 },
  { field: 'avg_duration_min', headerName: 'Avg Duration', type: 'number', flex: 0.7, minWidth: 105,
    valueFormatter: (value) => `${value} min` },
  { field: 'forum_posts', headerName: 'Forum Posts', type: 'number', flex: 0.7, minWidth: 100 },
  { field: 'quiz_avg', headerName: 'Quiz Avg', type: 'number', flex: 0.6, minWidth: 85 },
  { field: 'days_inactive', headerName: 'Days Inactive', type: 'number', flex: 0.7, minWidth: 110 },
  { field: 'resource_views', headerName: 'Resources', type: 'number', flex: 0.6, minWidth: 85 },
];

function buildRows(assignments) {
  return assignments.map((a) => ({
    id: a.student_id,
    student_name: a.student_name,
    cluster_id: a.cluster_id,
    cluster_label: a.cluster_label,
    login_count: a.features.login_count,
    avg_duration_min: a.features.avg_duration_min,
    forum_posts: a.features.forum_posts,
    quiz_avg: a.features.quiz_avg,
    days_inactive: a.features.days_inactive,
    resource_views: a.features.resource_views,
  }));
}

export default function ClustersPage() {
  const { courseId } = useCourse();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchClusters(courseId)
      .then((d) => { if (!cancelled) { setData(d); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [courseId]);

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Student Clusters</Typography>
        <Alert severity="error">Unable to load clusters. Make sure the backend is running.</Alert>
      </Box>
    );
  }
  if (!data) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Student Clusters</Typography>
        <Typography>Loading clusters...</Typography>
      </Box>
    );
  }

  const scatterSeries = data.summaries.map((s) => ({
    label: s.label,
    data: data.assignments
      .filter((a) => a.cluster_id === s.cluster_id)
      .map((a) => ({ x: a.x, y: a.y, id: a.student_id })),
    color: CLUSTER_COLORS[s.cluster_id % CLUSTER_COLORS.length],
  }));

  const gridRows = buildRows(data.assignments);

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Student Clusters</Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Clusters are unsupervised behavioral groups based on engagement patterns — they are not risk labels.
      </Alert>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        K-Means with k={data.k} · Silhouette score: {data.silhouette_score} · PCA variance explained: {data.pca_explained_variance.map((v) => `${(v * 100).toFixed(1)}%`).join(' + ')}
      </Alert>

      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        {data.summaries.map((s) => (
          <Grid key={s.cluster_id} size={{ xs: 12, sm: 6, md: 12 / data.k }}>
            <Card variant="outlined" sx={{ borderLeft: 4, borderLeftColor: CLUSTER_COLORS[s.cluster_id % CLUSTER_COLORS.length] }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" sx={{ color: CLUSTER_COLORS[s.cluster_id % CLUSTER_COLORS.length], fontWeight: 700 }}>{s.label}</Typography>
                <Typography variant="h5">{s.count} students</Typography>
                <Stack direction="row" sx={{ gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`Logins: ${s.avg_login_count}`} />
                  <Chip size="small" label={`Quiz: ${s.avg_quiz_avg}`} />
                  <Chip size="small" label={`Duration: ${s.avg_avg_duration_min}m`} />
                  <Chip size="small" label={`Forum: ${s.avg_forum_posts}`} />
                  <Chip size="small" label={`Resources: ${s.avg_resource_views}`} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Cluster Scatter Plot (PCA 2D)</Typography>
          <ScatterChart height={400} series={scatterSeries} xAxis={[{ label: 'PC1' }]} yAxis={[{ label: 'PC2' }]} />
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Student Assignments</Typography>
      <DataGrid
        rows={gridRows}
        columns={columns}
        density="compact"
        pageSizeOptions={[10, 20, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 20 } },
          sorting: { sortModel: [{ field: 'student_name', sort: 'asc' }] },
        }}
        disableColumnResize
      />
    </Box>
  );
}
