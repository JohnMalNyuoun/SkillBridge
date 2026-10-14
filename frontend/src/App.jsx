import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuth from './hooks/useAuth';

// Auth pages
import YouthLogin from './pages/auth/YouthLogin';
import YouthRegister from './pages/auth/YouthRegister';
import OrgLogin from './pages/auth/OrgLogin';
import OrgRegister from './pages/auth/OrgRegister';
import OrgReinstate from './pages/auth/OrgReinstate';
import PasswordRecovery from './pages/auth/PasswordRecovery';

// Youth pages
import YouthHome from './pages/youth/Home';
import YouthCourses from './pages/youth/Courses';
import CourseDetail from './pages/youth/CourseDetail';
import YouthApplications from './pages/youth/Applications';
import YouthNotifications from './pages/youth/Notifications';
import YouthProfile from './pages/youth/Profile';
import YouthSettings from './pages/youth/Settings';
import YouthAccount from './pages/youth/Account';
import YouthQuickAccess from './pages/youth/QuickAccess';
import Preferences from './pages/youth/Preferences';

// Organisation pages
import OrgDashboard from './pages/organisation/Dashboard';
import CourseAnalytics from './pages/organisation/CourseAnalytics';
import OrgCourses from './pages/organisation/Courses';
import OrgCourseForm from './pages/organisation/CourseForm';
import OrgCourseDetail from './pages/organisation/CourseDetail';
import OrgApplications from './pages/organisation/Applications';
import OrgProfile from './pages/organisation/Profile';
import OrgSettings from './pages/organisation/Settings';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrganisations from './pages/admin/Organisations';
import AdminCourses from './pages/admin/Courses';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import AdminCourseDetail from './pages/admin/CourseDetail';
import AdminNotifications from './pages/admin/Notifications';
import AdminUpdates from './pages/admin/Updates';
import OrgNotifications from './pages/organisation/Notifications';
import Landing from './pages/Landing';
import Updates from './pages/Updates';
import Impact from './pages/organisation/Impact';
import CourseOutcomes from './pages/organisation/CourseOutcomes';
import OutcomeForm from './pages/youth/OutcomeForm';
import Loader from './components/common/Loader';
import PublicYouthProfile from './pages/common/PublicYouthProfile';
import PublicOrganisationProfile from './pages/common/PublicOrganisationProfile';
import Seo from './components/common/Seo';
// Route guards 
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const YouthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'youth') return <Navigate to="/login" />;
  return children;
};

const OrgRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/org/login" />;
  if (user.role !== 'organisation') return <Navigate to="/org/login" />;
  return children;
};


const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/login" />;
  return children;
};
function App () {
  const location = useLocation();
  const routeRefreshKey = `${location.pathname}:${location.state?.__refreshNonce || 0}`;

  return (
    <>
      <Seo />
      <Routes key={routeRefreshKey}>
        {/* Public */}

        <Route path="/" element={<Landing />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/login" element={<YouthLogin />} />
        <Route path="/register" element={<YouthRegister />} />
        <Route path="/org/login" element={<OrgLogin />} />
        <Route path="/org/register" element={<OrgRegister />} />
        <Route path="/org/reinstate" element={<OrgReinstate />} />
        <Route path="/forgot-password" element={<PasswordRecovery accountType="youth" loginPath="/login" />} />
        <Route path="/org/forgot-password" element={<PasswordRecovery accountType="organisation" loginPath="/org/login" />} />

        {/* Shared profiles */}
        <Route path="/profiles/youth/:id" element={<AuthRoute><PublicYouthProfile /></AuthRoute>} />
        <Route path="/profiles/organisation/:id" element={<AuthRoute><PublicOrganisationProfile /></AuthRoute>} />

        {/* Youth */}
        <Route path="/home" element={<YouthRoute><YouthHome /></YouthRoute>} />
        <Route path="/courses" element={<YouthRoute><YouthCourses /></YouthRoute>} />
        <Route path="/courses/:id" element={<YouthRoute><CourseDetail /></YouthRoute>} />
        <Route path="/applications" element={<YouthRoute><YouthApplications /></YouthRoute>} />
        <Route path="/notifications" element={<YouthRoute><YouthNotifications /></YouthRoute>} />
        <Route path="/profile" element={<YouthRoute><YouthProfile /></YouthRoute>} />
        <Route path="/youth/profile" element={<YouthRoute><YouthProfile /></YouthRoute>} />
        <Route path="/settings" element={<YouthRoute><YouthSettings /></YouthRoute>} />
        <Route path="/youth/settings" element={<YouthRoute><YouthSettings /></YouthRoute>} />
        <Route path="/account" element={<YouthRoute><YouthAccount /></YouthRoute>} />
        <Route path="/youth/account" element={<YouthRoute><YouthAccount /></YouthRoute>} />
        <Route path="/quick-access" element={<YouthRoute><YouthQuickAccess /></YouthRoute>} />
        <Route path="/youth/quick-access" element={<YouthRoute><YouthQuickAccess /></YouthRoute>} />
        <Route path="/preferences" element={<YouthRoute><Preferences /></YouthRoute>} />
        <Route path="/youth/preferences" element={<YouthRoute><Preferences /></YouthRoute>} />

        {/* Organisation */}
        <Route path="/org/dashboard" element={<OrgRoute><OrgDashboard /></OrgRoute>} />
        <Route path="/org/analytics" element={<OrgRoute><CourseAnalytics /></OrgRoute>} />
        <Route path="/org/courses" element={<OrgRoute><OrgCourses /></OrgRoute>} />
        <Route path="/org/courses/new" element={<OrgRoute><OrgCourseForm /></OrgRoute>} />
        <Route path="/org/courses/:id" element={<OrgRoute><OrgCourseDetail /></OrgRoute>} />
        <Route path="/org/courses/:id/edit" element={<OrgRoute><OrgCourseForm /></OrgRoute>} />
        <Route path="/org/applications" element={<OrgRoute><OrgApplications /></OrgRoute>} />
        <Route path="/org/profile" element={<OrgRoute><OrgProfile /></OrgRoute>} />
        <Route path="/org/settings" element={<OrgRoute><OrgSettings /></OrgRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/organisations" element={<AdminRoute><AdminOrganisations /></AdminRoute>} />
        <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
        <Route path="/admin/courses/:id" element={<AdminRoute><AdminCourseDetail /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
        <Route path="/admin/updates" element={<AdminRoute><AdminUpdates /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/org/notifications" element={<OrgRoute><OrgNotifications /></OrgRoute>} />

        {/* Organisation impact */}
        <Route path="/org/impact" element={<OrgRoute><Impact /></OrgRoute>} />
        <Route path="/org/courses/:id/outcomes" element={<OrgRoute><CourseOutcomes /></OrgRoute>} />

        {/* Youth outcome form */}
        <Route path="/outcomes" element={<YouthRoute><OutcomeForm /></YouthRoute>} />
      </Routes>
    </>
  );
}

export default App;