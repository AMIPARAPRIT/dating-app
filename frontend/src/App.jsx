import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useChatStore } from './store/useChatStore';

import LandingPage    from './pages/LandingPage';
import AuthPage       from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import FeedPage       from './pages/FeedPage';
import MatchesPage    from './pages/MatchesPage';
import ChatPage       from './pages/ChatPage';
import ChatListPage   from './pages/ChatListPage';
import LikedChatPage  from './pages/LikedChatPage';
import ProfilePage    from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import InsightsPage   from './pages/InsightsPage';
import Layout         from './components/Layout';

// Shows a spinner while we restore the session from the token
function SessionLoader({ children }) {
  const { token, user, fetchMe } = useAuthStore();
  const { initSocket } = useChatStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (token && !user) {
        try {
          await fetchMe();
        } catch {
          // token invalid, clear it
          localStorage.removeItem('token');
        }
      }
      setReady(true);
      if (token) initSocket(token);
    };
    init();
  }, [token]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

// Requires token + completed profile
function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/" replace />;
  // user is loaded (SessionLoader guarantees this) — check profileComplete
  if (user && !user.profileComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

// Requires token only (for onboarding)
function OnboardingRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      />
      <SessionLoader>
        <Routes>
          <Route path="/"           element={<LandingPage />} />
          <Route path="/auth"       element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/feed"                    element={<FeedPage />} />
            <Route path="/matches"                 element={<MatchesPage />} />
            <Route path="/chats"                   element={<ChatListPage />} />
            <Route path="/notifications"           element={<NotificationsPage />} />
            <Route path="/insights"                element={<InsightsPage />} />
            <Route path="/chat/:matchId"           element={<ChatPage />} />
            <Route path="/chat/liked/:userId"      element={<LikedChatPage />} />
            <Route path="/profile"                 element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionLoader>
    </BrowserRouter>
  );
}
