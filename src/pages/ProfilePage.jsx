import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { fetchProfile } from '../api';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile().then(setProfile).catch(() => {
      setProfile({
        name: 'Demo Instructor',
        email: 'instructor@example.edu',
        role: 'Instructor',
        department: 'Learning Analytics',
        institution: 'Demo University',
      });
    });
  }, []);

  if (!profile) return <Typography>Loading profile...</Typography>;

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '800px' } }}>
      <Typography component="h2" variant="h6" sx={{ mb: 0.5 }}>Profile</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Your instructor account details.
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ width: 64, height: 64 }} alt={profile.name} src={profile.avatar}>
              {profile.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{profile.name}</Typography>
              <Chip size="small" label={profile.role} color="primary" variant="outlined" />
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack sx={{ gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Email</Typography>
              <Typography variant="body2">{profile.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Department</Typography>
              <Typography variant="body2">{profile.department}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Institution</Typography>
              <Typography variant="body2">{profile.institution}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
