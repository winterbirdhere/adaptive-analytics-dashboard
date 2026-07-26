import { NavLink, useLocation } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import BubbleChartRoundedIcon from '@mui/icons-material/BubbleChartRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

const mainListItems = [
  { text: 'Dashboard', icon: <HomeRoundedIcon />, path: '/' },
  { text: 'Recommendations', icon: <TipsAndUpdatesRoundedIcon />, path: '/recommendations' },
  { text: 'Students', icon: <PeopleRoundedIcon />, path: '/students' },
  { text: 'Engagement', icon: <AnalyticsRoundedIcon />, path: '/engagement' },
  { text: 'Assessments', icon: <AssignmentRoundedIcon />, path: '/assessments' },
];

const advancedListItems = [
  { text: 'Risk Review', icon: <PsychologyRoundedIcon />, path: '/predictions' },
  { text: 'Clusters', icon: <BubbleChartRoundedIcon />, path: '/clusters' },
];

const bottomListItems = [
  { text: 'Settings', icon: <SettingsRoundedIcon />, path: '/settings' },
];

function NavItem({ item, selected }) {
  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        component={NavLink}
        to={item.path}
        selected={selected}
        sx={{ textDecoration: 'none', color: 'inherit' }}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
}

export default function MenuContent() {
  const location = useLocation();

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <Stack>
        <List dense>
          {mainListItems.map((item) => (
            <NavItem key={item.text} item={item} selected={location.pathname === item.path} />
          ))}
        </List>
        <Divider sx={{ my: 0.5 }} />
        <List
          dense
          subheader={
            <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '28px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Advanced Insights
            </ListSubheader>
          }
        >
          {advancedListItems.map((item) => (
            <NavItem key={item.text} item={item} selected={location.pathname === item.path} />
          ))}
        </List>
      </Stack>
      <List dense>
        {bottomListItems.map((item) => (
          <NavItem key={item.text} item={item} selected={location.pathname === item.path} />
        ))}
      </List>
    </Stack>
  );
}
