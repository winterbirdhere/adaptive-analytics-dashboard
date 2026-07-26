import Chip from '@mui/material/Chip';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { studentRows } from '../../../data/mockData';

function getLast30DayLabels() {
  // Demo date: April 1, 2026. Last 30 days = Mar 3 to Apr 1.
  const labels = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 2, 3 + i); // March 3 = 2026-03-03
    labels.push(`${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`);
  }
  return labels;
}

function renderSparklineCell(params) {
  const data = getLast30DayLabels();
  const { value, colDef } = params;
  if (!value || value.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
      <SparkLineChart
        data={value}
        width={colDef.computedWidth || 100}
        height={32}
        plotType="bar"
        showHighlight
        showTooltip
        color="hsl(210, 98%, 42%)"
        xAxis={{ scaleType: 'band', data }}
      />
    </div>
  );
}

function renderRiskLevel(level) {
  const colors = { High: 'error', Medium: 'warning', Low: 'success' };
  return <Chip label={level} color={colors[level] || 'default'} size="small" />;
}

export const columns = [
  { field: 'studentName', headerName: 'Student', flex: 1.2, minWidth: 130 },
  { field: 'riskLevel', headerName: 'Risk Level', flex: 0.7, minWidth: 100, renderCell: (params) => renderRiskLevel(params.value) },
  { field: 'logins', headerName: 'Logins', type: 'number', headerAlign: 'left', flex: 0.6, minWidth: 80 },
  { field: 'quizAvg', headerName: 'Quiz Avg', type: 'number', headerAlign: 'left', flex: 0.7, minWidth: 100 },
  { field: 'activityTrend', headerName: 'Login Trend (30d)', flex: 1.2, minWidth: 170, sortable: false, renderCell: renderSparklineCell },
];

export const rows = studentRows;
