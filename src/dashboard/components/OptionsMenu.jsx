import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Divider, { dividerClasses } from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MuiMenuItem from '@mui/material/MenuItem';
import { paperClasses } from '@mui/material/Paper';
import { listClasses } from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon, { listItemIconClasses } from '@mui/material/ListItemIcon';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import MenuButton from './MenuButton';
import { signOut } from '../../auth';

const MenuItem = styled(MuiMenuItem)({
  margin: '2px 0',
});

export default function OptionsMenu() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const goTo = (path) => { handleClose(); navigate(path); };

  const handleLogout = () => {
    setLogoutOpen(false);
    handleClose();
    signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <React.Fragment>
      <MenuButton aria-label="Open menu" onClick={handleClick} sx={{ borderColor: 'transparent' }}>
        <MoreVertRoundedIcon />
      </MenuButton>
      <Menu
        anchorEl={anchorEl} id="menu" open={open}
        onClose={handleClose} onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          [`& .${listClasses.root}`]: { padding: '4px' },
          [`& .${paperClasses.root}`]: { padding: 0 },
          [`& .${dividerClasses.root}`]: { margin: '4px -4px' },
        }}
      >
        <MenuItem onClick={() => goTo('/profile')}>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => goTo('/profile')}>
          <ListItemText>My account</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => goTo('/settings')}>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => { e.stopPropagation(); setLogoutOpen(true); }}
          sx={{ [`& .${listItemIconClasses.root}`]: { ml: 'auto', minWidth: 0 } }}
        >
          <ListItemText>Logout</ListItemText>
          <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
        </MenuItem>
      </Menu>

      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Logout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to log out? You will need to sign in again to continue.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} variant="contained" color="primary">Logout</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
