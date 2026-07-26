import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import NavbarBreadcrumbs from './NavbarBreadcrumbs';
import MenuButton from './MenuButton';
import ColorModeIconDropdown from '../../shared-theme/ColorModeIconDropdown';
import { fetchNotifications } from '../../api';
import { useCourse } from '../../CourseContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useCourse();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchNotifications(courseId)
      .then((d) => setUnread(d.unread_count || 0))
      .catch(() => {});
  }, [courseId]);

  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: 'none', md: 'flex' },
        width: '100%',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        maxWidth: { sm: '100%', md: '1700px' },
        pt: 1.5,
      }}
      spacing={2}
    >
      <NavbarBreadcrumbs />
      <Stack direction="row" sx={{ gap: 1 }}>
        <MenuButton
          aria-label="Open notifications"
          onClick={() => location.pathname === '/notifications' ? navigate(-1) : navigate('/notifications')}
        >
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsRoundedIcon />
          </Badge>
        </MenuButton>
        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}
