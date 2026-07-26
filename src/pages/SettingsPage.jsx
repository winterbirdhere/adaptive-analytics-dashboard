import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

export default function SettingsPage() {
  const [notifRisk, setNotifRisk] = useState(() => load('setting_notif_risk', true));
  const [notifRec, setNotifRec] = useState(() => load('setting_notif_rec', true));
  const [snack, setSnack] = useState(null);

  const toggle = (key, setter) => (e) => {
    const val = e.target.checked;
    setter(val);
    localStorage.setItem(key, JSON.stringify(val));
    setSnack('Setting saved.');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '800px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 0.5 }}>Settings</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Configure dashboard preferences. Changes are saved automatically.
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Notifications</Typography>
          <Stack>
            <FormControlLabel
              control={<Switch checked={notifRisk} onChange={toggle('setting_notif_risk', setNotifRisk)} />}
              label="Notify on new high-risk students"
            />
            <FormControlLabel
              control={<Switch checked={notifRec} onChange={toggle('setting_notif_rec', setNotifRec)} />}
              label="Notify on new recommendations"
            />
          </Stack>
        </CardContent>
      </Card>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack(null)} message={snack} />
    </Box>
  );
}
