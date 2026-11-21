import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import OrganisationLanding from './pages/OrganisationLanding';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyJourney from './pages/MyJourney';
import Explore from './pages/Explore';
import Inspire from './pages/Inspire';
import OpportunityNew from './pages/OpportunityNew';
import SettingsView from './pages/SettingsView';
import UserProfileView from './pages/UserProfileView';
import { useAuth } from './context/AuthContext';

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={user.role === 'admin' ? '/dashboard' : '/journey'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/organisations" element={<OrganisationLanding />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/home" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/inspire" element={<Inspire />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/profile/:id" element={<UserProfileView />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/opportunities/new"
          element={<ProtectedRoute role="admin"><OpportunityNew /></ProtectedRoute>}
        />
        <Route
          path="/journey"
          element={<ProtectedRoute role="student"><MyJourney /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
