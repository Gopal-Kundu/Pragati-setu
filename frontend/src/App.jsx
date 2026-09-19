import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { StateProvider } from './context/StateContext';
import { fetchSolvedChallenges } from './store/slices/ecosystemSlice';
import { fetchCurrentUser } from './store/slices/authSlice';
import ErrorBoundary, { ErrorFallback } from './components/common/ErrorBoundary';
import LoadingScreen from './components/common/LoadingScreen';
import MainLayout from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import CommunityPage from './pages/CommunityPage';
import GovernmentPage from './pages/GovernmentPage';
import UniversityPage from './pages/UniversityPage';
import IndustryPage from './pages/IndustryPage';
import MapPage from './pages/MapPage';
import AuthPage from './pages/AuthPage';
import LanguagePage from './pages/LanguagePage';

function AppRouter() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map user role to target route
  const getTargetRoute = (role) => {
    switch (role) {
      case 'government':
      case 'admin':
        return '/dashboard';
      case 'industry':
        return '/industry';
      case 'university':
        return '/university';
      case 'citizen':
      case 'panchayat':
      default:
        return '/community';
    }
  };

  // Run on every render: based on user, always navigate to appropriate route
  // and make sure if user is logged in already, show these routes on base URL "/"
  useEffect(() => {
    if (user) {
      const targetRoute = getTargetRoute(user.role);
      if (location.pathname === '/' || location.pathname === '/auth') {
        navigate(targetRoute, { replace: true });
      }
    }
  });

  useEffect(() => {
    // 1. fetchSolvedChallenges(6) -> GET /api/problems?resolutionStatus=solved&limit=6
    // 2. fetchCurrentUser() -> Check HTTP-Only cookie session on /api/auth/me
    const initializeAppData = async () => {
      try {
        await Promise.allSettled([
          dispatch(fetchSolvedChallenges(6)),
          dispatch(fetchCurrentUser())
        ]);
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAppData();
  }, [dispatch]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/lan" element={<LanguagePage />} />
      <Route path="/" element={<MainLayout />}>
        <Route
          index
          element={
            user ? <Navigate to={getTargetRoute(user.role)} replace /> : <LandingPage />}
        />

        <Route path="community" element={<CommunityPage />} />
        <Route path="citizen" element={<Navigate to="/community" replace />} />
        <Route path="panchayat" element={<Navigate to="/community" replace />} />

        <Route path="dashboard" element={<GovernmentPage />} />
        <Route path="university" element={<UniversityPage />} />

        <Route path="industry" element={<IndustryPage />} />
        <Route path="map" element={<MapPage />} />
        <Route
          path="auth"
          element={
            user ? <Navigate to={getTargetRoute(user.role)} replace /> : <AuthPage />
          }
        />

        <Route path="*" element={<ErrorFallback />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StateProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </StateProvider>
    </ErrorBoundary>
  );
}
