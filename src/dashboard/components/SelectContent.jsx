import { useState, useEffect } from 'react';
import MuiAvatar from '@mui/material/Avatar';
import MuiListItemAvatar from '@mui/material/ListItemAvatar';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Select, { selectClasses } from '@mui/material/Select';
import { styled } from '@mui/material/styles';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { useCourse } from '../../CourseContext';
import { fetchCourses } from '../../api';

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

const ListItemAvatar = styled(MuiListItemAvatar)({
  minWidth: 0,
  marginRight: 12,
});

export default function SelectContent() {
  const { courseId, setCourseId } = useCourse();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchCourses()
      .then((res) => setCourses(res.courses))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setCourseId(val === '' ? null : val);
  };

  return (
    <Select
      labelId="course-select"
      id="course-simple-select"
      value={courseId ?? ''}
      onChange={handleChange}
      displayEmpty
      inputProps={{ 'aria-label': 'Select course' }}
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        '&.MuiList-root': { p: '8px' },
        [`& .${selectClasses.select}`]: { display: 'flex', alignItems: 'center', gap: '2px', pl: 1 },
      }}
    >
      <MenuItem value="">
        <ListItemAvatar>
          <Avatar alt="All Courses"><SchoolRoundedIcon sx={{ fontSize: '1rem' }} /></Avatar>
        </ListItemAvatar>
        <ListItemText primary="All Courses" secondary="Overview" />
      </MenuItem>
      {courses.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          <ListItemAvatar>
            <Avatar alt={c.code}><SchoolRoundedIcon sx={{ fontSize: '1rem' }} /></Avatar>
          </ListItemAvatar>
          <ListItemText primary={c.code} secondary={c.name} />
        </MenuItem>
      ))}
    </Select>
  );
}
