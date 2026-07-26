import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import { useCourse } from '../CourseContext';

const sevColor = (s) => s === 'urgent' ? 'error' : s === 'action' ? 'warning' : s === 'positive' ? 'success' : 'info';
const sevLabel = (s) => s === 'urgent' ? 'Attention' : s === 'action' ? 'Action Needed' : s === 'positive' ? 'Good News' : 'Info';

export default function NotificationsPage() {
  const { courseId } = useCourse();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetchNotifications(courseId)
      .then((d) => { setData(d); setError(false); })
      .catch(() => setError(true));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const handleRead = async (id) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => n.id === id ? { ...n, is_read: 1 } : n),
      unread_count: Math.max(0, prev.unread_count - 1),
    }));
    try { await markNotificationRead(id); } catch { load(); }
  };

  const handleReadAll = async () => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, is_read: 1 })),
      unread_count: 0,
    }));
    try { await markAllNotificationsRead(); } catch { load(); }
  };

  if (error) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '800px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
        <Alert severity="error">Unable to load notifications. Is the backend running?</Alert>
      </Box>
    );
  }
  if (!data) {
    return (
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '800px' } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '800px' } }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography component="h2" variant="h6" sx={{ mb: 0 }}>Notifications</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {data.unread_count > 0 ? `${data.unread_count} unread` : 'All caught up'}
          </Typography>
        </Box>
        {data.unread_count > 0 && (
          <Button size="small" startIcon={<DoneAllIcon />} onClick={handleReadAll}>
            Mark all read
          </Button>
        )}
      </Stack>

      {data.notifications.length === 0 ? (
        <Alert severity="info">No notifications yet.</Alert>
      ) : (
        <Stack sx={{ gap: 1 }}>
          {data.notifications.map((n) => (
            <Card
              key={n.id} variant="outlined"
              sx={{ opacity: n.is_read ? 0.7 : 1, transition: 'opacity 0.15s' }}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip size="small" color={sevColor(n.severity)} label={sevLabel(n.severity)} />
                      <Typography variant="subtitle2">{n.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.created_date}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{n.body}</Typography>
                  </Box>
                  {!n.is_read && (
                    <IconButton size="small" onClick={() => handleRead(n.id)} title="Mark as read">
                      <CheckCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
