import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CourseProvider } from './CourseContext';
import AuthGuard from './AuthGuard';
import SignIn from './sign-in/SignIn';
import Dashboard from './dashboard/Dashboard';
import MainGrid from './dashboard/components/MainGrid';
import EngagementPage from './pages/EngagementPage';
import StudentsPage from './pages/StudentsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import PredictionsPage from './pages/PredictionsPage';
import ClustersPage from './pages/ClustersPage';
import RecommendationsPage from './pages/RecommendationsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <CourseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route element={<AuthGuard />}>
            <Route element={<Dashboard />}>
              <Route index element={<MainGrid />} />
              <Route path="engagement" element={<EngagementPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="assessments" element={<AssessmentsPage />} />
              <Route path="predictions" element={<PredictionsPage />} />
              <Route path="clusters" element={<ClustersPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </CourseProvider>
  );
}

export default App;
