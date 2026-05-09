import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { lazy, Suspense } from 'react';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const Loader = () => (
  <div className="h-screen flex items-center justify-center bg-surface-950">
    <div className="flex gap-1">
      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-dot" />
      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-dot [animation-delay:0.16s]" />
      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-dot [animation-delay:0.32s]" />
    </div>
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/*" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}
