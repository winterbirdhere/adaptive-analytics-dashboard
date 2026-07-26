import { DataGrid } from '@mui/x-data-grid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { columns } from '../internals/data/gridData';
import { fetchStudents } from '../../api';
import { useCourse } from '../../CourseContext';
import useCourseData from '../../hooks/useCourseData';

export default function CustomizedDataGrid() {
  const { courseId } = useCourse();
  const { data, error } = useCourseData(courseId, fetchStudents);
  const rows = data?.students;

  if (error) {
    return (
      <Alert severity="warning">
        Student data is unavailable. Is the backend running?
      </Alert>
    );
  }

  if (!rows) {
    return (
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Loading student data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowClassName={(params) =>
          params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
        }
        initialState={{
          pagination: { paginationModel: { pageSize: 20 } },
        }}
        pageSizeOptions={[10, 20, 50]}
        disableColumnResize
        density="compact"
        slotProps={{
          filterPanel: {
            filterFormProps: {
              logicOperatorInputProps: { variant: 'outlined', size: 'small' },
              columnInputProps: { variant: 'outlined', size: 'small', sx: { mt: 'auto' } },
              operatorInputProps: { variant: 'outlined', size: 'small', sx: { mt: 'auto' } },
              valueInputProps: { InputComponentProps: { variant: 'outlined', size: 'small' } },
            },
          },
        }}
      />
    </Box>
  );
}
