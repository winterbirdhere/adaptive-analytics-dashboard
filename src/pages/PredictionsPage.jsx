import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGrid } from '@mui/x-data-grid';
import { fetchBatchPredictions, fetchModelInfo } from '../api';
import { useCourse } from '../CourseContext';

const riskColor = (level) =>
  level === 'High' ? 'error' : level === 'Medium' ? 'warning' : 'success';
const LABEL_NAMES = ['Low', 'Medium', 'High'];

/* ---- Sub-components for model details ---- */

function ConfusionMatrix({ matrix, title }) {
  if (!matrix) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{title}</Typography>
      <Table size="small" sx={{ maxWidth: 300, mt: 0.5 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: '0.75rem', p: 0.5 }}>Actual \ Pred</TableCell>
            {LABEL_NAMES.map((n) => (
              <TableCell key={n} align="center" sx={{ fontSize: '0.75rem', p: 0.5 }}>{n}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.map((row, i) => (
            <TableRow key={i}>
              <TableCell sx={{ fontSize: '0.75rem', p: 0.5, fontWeight: 600 }}>{LABEL_NAMES[i]}</TableCell>
              {row.map((val, j) => (
                <TableCell key={j} align="center" sx={{
                  fontSize: '0.75rem', p: 0.5,
                  fontWeight: i === j ? 700 : 400,
                  color: i === j ? 'success.main' : val > 0 ? 'error.main' : 'text.secondary',
                }}>{val}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ImportanceBars({ importances, title, isPermutation }) {
  if (!importances) return null;
  const entries = Object.entries(importances)
    .map(([name, val]) => [name, isPermutation ? val.mean : val])
    .sort(([, a], [, b]) => b - a);
  const maxVal = Math.max(...entries.map(([, v]) => v), 0.01);
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{title}</Typography>
      {entries.map(([name, value]) => (
        <Stack key={name} direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.3 }}>
          <Typography variant="body2" sx={{ minWidth: 130, fontSize: '0.8rem' }}>{name}</Typography>
          <LinearProgress variant="determinate" value={(value / maxVal) * 100} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
          <Typography variant="body2" sx={{ minWidth: 55, textAlign: 'right', fontSize: '0.8rem' }}>
            {(value * 100).toFixed(1)}%
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

function ClassMetrics({ report, title }) {
  if (!report) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 600 }}>{title}</Typography>
      <Table size="small" sx={{ maxWidth: 450, mt: 0.5 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: '0.75rem', p: 0.5 }}>Class</TableCell>
            <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>Precision</TableCell>
            <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>Recall</TableCell>
            <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>F1</TableCell>
            <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>Support</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {LABEL_NAMES.map((name) => {
            const m = report[name];
            if (!m) return null;
            return (
              <TableRow key={name}>
                <TableCell sx={{ fontSize: '0.75rem', p: 0.5 }}>{name}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(m.precision * 100).toFixed(0)}%</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(m.recall * 100).toFixed(0)}%</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(m['f1-score'] * 100).toFixed(0)}%</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{m.support}</TableCell>
              </TableRow>
            );
          })}
          {report['macro avg'] && (
            <TableRow>
              <TableCell sx={{ fontSize: '0.75rem', p: 0.5, fontWeight: 600 }}>Macro Avg</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(report['macro avg'].precision * 100).toFixed(0)}%</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(report['macro avg'].recall * 100).toFixed(0)}%</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{(report['macro avg']['f1-score'] * 100).toFixed(0)}%</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem', p: 0.5 }}>{report['macro avg'].support}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

function ModelVariantCard({ variant, label }) {
  if (!variant) return null;
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}: {variant.label}</Typography>
        <Stack direction="row" sx={{ gap: 2, mb: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`Train: ${variant.train_accuracy}%`} color="primary" />
          {variant.cv_accuracy != null && <Chip size="small" label={`CV: ${variant.cv_accuracy}%`} color="secondary" />}
          <Chip size="small" label={`Depth: ${variant.tree_depth}`} variant="outlined" />
          <Chip size="small" label={`Leaves: ${variant.n_leaves}`} variant="outlined" />
        </Stack>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImportanceBars importances={variant.gini_importances} title="Gini Importance" />
            <ImportanceBars importances={variant.permutation_importances} title="Permutation Importance" isPermutation />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ClassMetrics report={variant.train_report} title="Train Metrics (per class)" />
            <ConfusionMatrix matrix={variant.train_confusion_matrix} title="Train Confusion Matrix" />
            {variant.cv_confusion_matrix && <ConfusionMatrix matrix={variant.cv_confusion_matrix} title="CV Confusion Matrix" />}
          </Grid>
        </Grid>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1 }}>Decision Rules</Typography>
        <Box component="pre" sx={{
          fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'action.hover', color: 'text.primary',
          p: 1.5, borderRadius: 1, overflow: 'auto', whiteSpace: 'pre-wrap', mt: 0.5,
        }}>{variant.tree_rules}</Box>
      </CardContent>
    </Card>
  );
}

/* ---- Main page ---- */

export default function PredictionsPage() {
  const { courseId } = useCourse();
  const [predictions, setPredictions] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchBatchPredictions(courseId), fetchModelInfo()])
      .then(([batch, info]) => { if (!cancelled) { setPredictions(batch); setModelInfo(info); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [courseId]);

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Risk Review</Typography>
        <Alert severity="error">Unable to load model data. Make sure the backend is running on port 8000.</Alert>
      </Box>
    );
  }
  if (!predictions || !modelInfo) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Risk Review</Typography>
        <Typography>Loading model data...</Typography>
      </Box>
    );
  }

  const mismatches = predictions.predictions.filter(
    (p) => p.rule_based_level && p.risk_level !== p.rule_based_level
  );

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 0.5 }}>Risk Review</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Comparing ML predictions with the canonical rule-based risk used across the app. Rule-based scores are the single source of truth.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This page compares the ML model's predictions against the canonical rule-based risk scores used across the app.
        The rule-based scorer is the single source of truth for all risk labels, recommendations, and notifications.
        The ML model is shown here for research comparison only.
      </Alert>

      {/* Warnings */}
      {modelInfo.warnings && modelInfo.warnings.length > 0 && (
        <Stack sx={{ gap: 1, mb: 2 }}>
          {modelInfo.warnings.map((w, i) => (
            <Alert key={i} severity="warning" variant="outlined">{w}</Alert>
          ))}
        </Stack>
      )}

      {/* Method banner — compact */}
      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        Method: <strong>{predictions.method}</strong>
        {modelInfo.n_samples && <> · {modelInfo.n_samples} samples</>}
        {modelInfo.class_distribution && (
          <> · Labels: {Object.entries(modelInfo.class_distribution).map(([k, v]) => `${k}: ${v}`).join(', ')}</>
        )}
        {mismatches.length > 0 && <> · {mismatches.length} ML vs Rule mismatches</>}
      </Alert>

      {/* PRIMARY: Per-student predictions table */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Per-Student Predictions</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Rule-Based = canonical risk used across the app. ML Prediction = model output for comparison.
      </Typography>
      <Box sx={{ mb: 3 }}>
        <DataGrid
          rows={predictions.predictions.map((p) => ({
            id: p.student_id,
            student_name: p.student_name,
            ml_risk: p.risk_level,
            canonical_risk: p.rule_based_level || '—',
            login_count: p.features.login_count,
            avg_duration_min: p.features.avg_duration_min,
            forum_posts: p.features.forum_posts,
            quiz_avg: p.features.quiz_avg,
          }))}
          columns={[
            { field: 'student_name', headerName: 'Student', flex: 1, minWidth: 120 },
            { field: 'canonical_risk', headerName: 'Rule-Based', flex: 0.7, minWidth: 100,
              renderCell: (params) => params.value === '—' ? '—' : <Chip size="small" color={riskColor(params.value)} label={params.value} /> },
            { field: 'ml_risk', headerName: 'ML Prediction', flex: 0.7, minWidth: 110,
              renderCell: (params) => <Chip size="small" color={riskColor(params.value)} label={params.value} /> },
            { field: 'login_count', headerName: 'Logins', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 70 },
            { field: 'avg_duration_min', headerName: 'Avg Duration', type: 'number', headerAlign: 'left', flex: 0.7, minWidth: 105,
              valueFormatter: (value) => `${value} min` },
            { field: 'forum_posts', headerName: 'Forum Posts', type: 'number', headerAlign: 'left', flex: 0.7, minWidth: 100 },
            { field: 'quiz_avg', headerName: 'Quiz Avg', type: 'number', headerAlign: 'left', flex: 0.5, minWidth: 80 },
          ]}
          density="compact"
          pageSizeOptions={[10, 20, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
            sorting: { sortModel: [] },
          }}
          getRowClassName={(params) =>
            params.row.ml_risk !== params.row.canonical_risk && params.row.canonical_risk !== '—' ? 'mismatch-row' : ''
          }
          sx={{ '& .mismatch-row': { bgcolor: 'action.hover' } }}
        />
      </Box>

    </Box>
  );
}
