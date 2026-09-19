import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/StateContext';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser, resetAuthState } from '../../store/slices/authSlice';
import { notificationApi } from '../../services/notificationApi';
import NotificationsModal from './NotificationsModal';
import { LogIn, LogOut, UserCheck, Menu, X, Globe, User, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const { lang = 'en', setLang = () => {} } = useAppState() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Notifications State for all roles
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!authState.isAuthenticated || !authState.user) return;
    try {
      const res = await notificationApi.getMyNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount ?? res.notifications.filter(n => !n.read).length);
      }
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      fetchNotifications();
      // Poll notifications every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [authState.isAuthenticated, authState.user]);

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    setUnreadCount(0);
    notificationApi.markAllRead().catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      dispatch(resetAuthState());
      toast.success('Logged out successfully');
      setMobileMenuOpen(false);
      navigate('/auth', { replace: true });
    }
  };

  const getRoleDashboardRoute = (role) => {
    switch (role) {
      case 'government':
      case 'admin':
        return '/dashboard';
      case 'university':
        return '/university';
      case 'industry':
        return '/industry';
      case 'citizen':
      case 'panchayat':
      default:
        return '/community';
    }
  };

  const brandDestination = authState.isAuthenticated && authState.user
    ? getRoleDashboardRoute(authState.user.role)
    : '/';

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. Logo & Project Name */}
          <Link 
            to={brandDestination}
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group flex-shrink-0 min-w-0"
          >
            <div className="relative flex-shrink-0">
              <img 
                src="/jharkhand_logo.svg" 
                alt="Jharkhand Govt Emblem" 
                className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-105" 
              />
            </div>
            <div className="truncate">
              <span className="font-black text-base sm:text-xl text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors font-heading truncate block">
                Jharkhand Pragati Setu
              </span>
            </div>
          </Link>

          {/* 2. Right Controls (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center space-x-3 sm:space-x-4">
            {/* Language Selector Button */}
            <button
              onClick={() => navigate('/lan')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-sm"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Language</span>
            </button>


            {/* Global Notification Bell (For all authenticated roles) */}
            {authState.isAuthenticated && authState.user && (
              <button
                onClick={handleOpenNotifications}
                className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer group"
                title="Notifications"
              >
                <Bell className="w-4 h-4 transition-transform group-hover:rotate-12" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm animate-pulse" />
                )}
              </button>
            )}

            {/* Auth State Button */}
            {authState.isAuthenticated && authState.user ? (
              <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm">
                <div className="flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs text-slate-800 font-bold max-w-[200px] truncate" title={authState.user.name}>
                    {['university', 'industry', 'government', 'admin'].includes(authState.user.role)
                      ? authState.user.name
                      : (authState.user.name?.split(' ')[0] || authState.user.name)}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {authState.user.role}
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="text-slate-500 hover:text-rose-600 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>Login / Sign Up</span>
              </Link>
            )}
          </div>

          {/* 3. Mobile Compact Controls (< 640px) */}
          <div className="flex sm:hidden items-center space-x-2">
            {/* Mobile Notification Bell */}
            {authState.isAuthenticated && authState.user && (
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm animate-pulse" />
                )}
              </button>
            )}

            {/* Compact Language Button */}
            <button
              onClick={() => navigate('/lan')}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Language</span>
            </button>


            {/* Mobile Auth Button */}
            {authState.isAuthenticated && authState.user ? (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* Unified Notifications Modal for All Roles */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
      />
    </>
  );
}
