import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import UndoIcon from '@mui/icons-material/Undo';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import { fetchRecommendations, patchRecommendation } from '../api';
import { useCourse } from '../CourseContext';

/* ── Risk bar color for left border ── */
const riskBarColor = { High: '#B42318', Medium: '#B54708', Low: '#13715B' };
const riskChipColor = (l) => (l === 'High' ? 'error' : l === 'Medium' ? 'warning' : 'success');

/* ── Metric card style ── */
const metricSx = {
  height: '100%', display: 'flex', flexDirection: 'column',
  justifyContent: 'center', alignItems: 'center', textAlign: 'center',
  py: 2, px: 1.5, '&:last-child': { pb: 2 },
};

/* ── Student Card ── */
const StudentCard = memo(function StudentCard({ student, isBusy, onStatus }) {
  const recId = student.rec_id;
  const status = student.status || 'pending';
  const isPending = status === 'pending';
  const barColor = riskBarColor[student.risk_level] || '#999';

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: isBusy ? 0.5 : isPending ? 1 : 0.6,
        borderLeft: 4,
        borderLeftColor: barColor,
        transition: 'opacity 0.15s, box-shadow 0.15s',
        '&:hover': isPending ? { boxShadow: 2 } : {},
      }}
    >
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          {/* Left: info */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            {/* Row 1: name + risk chip */}
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {student.student_name}
              </Typography>
              <Chip size="small" color={riskChipColor(student.risk_level)} label={student.risk_level} />
              {!isPending && (
                <Chip size="small" label={status.charAt(0).toUpperCase() + status.slice(1)} variant="outlined" sx={{ fontSize: '0.7rem' }} />
              )}
            </Stack>

            {/* Row 2: action title — large and bold */}
            <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {student.action}
            </Typography>

            {/* Row 3: reason — muted */}
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              {student.reason}
            </Typography>

            {/* Row 4: cluster chip — small outline */}
            {student.cluster_label && (
              <Chip size="small" label={student.cluster_label} variant="outlined" sx={{ fontSize: '0.7rem', mt: 0.25 }} />
            )}
          </Box>

          {/* Right: action buttons */}
          <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
            {status !== 'acted' && (
              <Tooltip title="Mark as acted on" arrow>
                <span>
                  <IconButton color="success" disabled={isBusy || !recId} onClick={() => onStatus(recId, 'acted')} size="small"
                    sx={{ border: 1, borderColor: 'divider' }}>
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {status !== 'dismissed' && (
              <Tooltip title="Dismiss" arrow>
                <span>
                  <IconButton disabled={isBusy || !recId} onClick={() => onStatus(recId, 'dismissed')} size="small"
                    sx={{ border: 1, borderColor: 'divider' }}>
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {status !== 'saved' && (
              <Tooltip title="Save for follow-up" arrow>
                <span>
                  <IconButton color="info" disabled={isBusy || !recId} onClick={() => onStatus(recId, 'saved')} size="small"
                    sx={{ border: 1, borderColor: 'divider' }}>
                    <BookmarkBorderIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {!isPending && (
              <Tooltip title="Reset to pending" arrow>
                <span>
                  <IconButton color="warning" disabled={isBusy || !recId} onClick={() => onStatus(recId, 'pending')} size="small"
                    sx={{ border: 1, borderColor: 'divider' }}>
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});

/* ── Main Page ── */
export default function RecommendationsPage() {
  const { courseId } = useCourse();
  const [students, setStudents] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [inflightIds, setInflightIds] = useState(new Set());
  const [snack, setSnack] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const load = useCallback(() => {
    fetchRecommendations(courseId)
      .then((d) => { setStudents(d.students || []); setError(false); })
      .catch(() => setError(true));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const handleStatus = useCallback((recId, newStatus) => {
    setStudents((prev) => {
      const s = prev.find((s) => s.rec_id === recId);
      if (!s || s.status === newStatus) return prev;
      const prevStatus = s.status;
      setInflightIds((ids) => { const n = new Set(ids); n.add(recId); return n; });
      patchRecommendation(recId, newStatus)
        .catch(() => {
          setStudents((l) => l.map((s) => (s.rec_id === recId ? { ...s, status: prevStatus } : s)));
          setSnack('Update failed — change reverted.');
        })
        .finally(() => {
          setInflightIds((ids) => { const n = new Set(ids); n.delete(recId); return n; });
        });
      return prev.map((s) => (s.rec_id === recId ? { ...s, status: newStatus } : s));
    });
  }, []);

  const filtered = useMemo(() => {
    if (!students) return null;
    const list = filter === 'all' ? [...students] : students.filter((s) => s.status === filter);
    // In 'all' view, sort by status group (pending first) then by risk within each group
    if (filter === 'all') {
      const statusOrder = { pending: 0, saved: 1, acted: 2, dismissed: 3 };
      const riskOrder = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => {
        const sa = statusOrder[a.status] ?? 4;
        const sb = statusOrder[b.status] ?? 4;
        if (sa !== sb) return sa - sb;
        const ra = riskOrder[a.risk_level] ?? 3;
        const rb = riskOrder[b.risk_level] ?? 3;
        if (ra !== rb) return ra - rb;
        return (b.risk_score || 0) - (a.risk_score || 0);
      });
    }
    return list;
  }, [students, filter]);

  const counts = useMemo(() => {
    if (!students) return { total: 0, high: 0, pending: 0, acted: 0, dismissed: 0, saved: 0 };
    let high = 0, pending = 0, acted = 0, dismissed = 0, saved = 0;
    for (const s of students) {
      if (s.risk_level === 'High') high++;
      if (s.status === 'pending') pending++;
      if (s.status === 'acted') acted++;
      if (s.status === 'dismissed') dismissed++;
      if (s.status === 'saved') saved++;
    }
    return { total: students.length, high, pending, acted, dismissed, saved };
  }, [students]);

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1200px' } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Intervention Queue</Typography>
        <Alert severity="error">Unable to load recommendations. Make sure the backend is running on port 8000.</Alert>
      </Box>
    );
  }
  if (!filtered) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1200px' } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Intervention Queue</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading recommendations…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1200px' } }}>
      {/* ── Page Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Intervention Queue
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          Prioritized actions for {courseId ? 'this course' : 'all courses'} · sorted by urgency
        </Typography>
      </Box>

      {/* ── Summary Strip ── */}
      <Grid container spacing={2} columns={12} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <PeopleRoundedIcon sx={{ fontSize: 22, color: 'text.secondary', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Flagged</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{counts.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <WarningAmberRoundedIcon sx={{ fontSize: 22, color: 'error.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>High Risk</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{counts.high}</Typography>
              {counts.high > 0 && <Chip size="small" color="error" label="Urgent" sx={{ mt: 0.5 }} />}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <PendingActionsRoundedIcon sx={{ fontSize: 22, color: 'warning.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pending</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{counts.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={metricSx}>
              <TaskAltRoundedIcon sx={{ fontSize: 22, color: 'success.main', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Acted On</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{counts.acted}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Guide ── */}
      <Alert
        severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2 }}
        action={
          <Button size="small" color="inherit" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? 'Hide' : 'How it works'}
          </Button>
        }
      >
        Each row is one student with one recommended action, sorted by risk severity.
      </Alert>
      <Collapse in={showGuide}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Risk levels come from the canonical rule-based scorer, consistent across all pages.
            Use the action buttons to mark each recommendation as acted on, dismissed, or saved.
          </Typography>
          <Typography variant="body2">
            Cluster labels describe engagement patterns (behavioral groups), not risk levels.
          </Typography>
        </Alert>
      </Collapse>

      {/* ── Filters ── */}
      <ToggleButtonGroup
        value={filter} exclusive
        onChange={(_, v) => v && setFilter(v)}
        size="small"
        sx={{ mb: 2.5 }}
      >
        <ToggleButton value="all">All ({counts.total})</ToggleButton>
        <ToggleButton value="pending">Pending ({counts.pending})</ToggleButton>
        <ToggleButton value="acted">Acted ({counts.acted})</ToggleButton>
        <ToggleButton value="dismissed">Dismissed ({counts.dismissed})</ToggleButton>
        <ToggleButton value="saved">Saved ({counts.saved})</ToggleButton>
      </ToggleButtonGroup>

      {/* ── Student Queue ── */}
      {filtered.length === 0 ? (
        <Alert severity="success" sx={{ mt: 1 }}>No students match this filter.</Alert>
      ) : (
        <Stack sx={{ gap: 1.5 }}>
          {filtered.map((s) => (
            <StudentCard
              key={s.student_id}
              student={s}
              isBusy={inflightIds.has(s.rec_id)}
              onStatus={handleStatus}
            />
          ))}
        </Stack>
      )}

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
    </Box>
  );
}
