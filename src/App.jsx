import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged, signOut } from './firebase';
import useSkillStore from './stores/useSkillStore';
import useProgressStore from './stores/useProgressStore';
import useAchievementStore from './stores/useAchievementStore';
import useToastStore from './stores/useToastStore';
import { isAdminUser } from './utils/firestoreHelpers';
import { useState } from 'react';
import { playAchievement } from './utils/sound';
import ToastContainer from './components/Toast';

const Home = lazy(() => import('./pages/Home'));
const Training = lazy(() => import('./pages/Training'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const Profile = lazy(() => import('./pages/Profile'));
const AuthComp = lazy(() => import('./components/Auth'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function LoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="spinner-neural" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsub;
  }, []);
  if (checking) return <LoadingFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AdminRoute({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) return <LoadingFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdminUser(user)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const fetchSkills = useSkillStore((s) => s.fetchSkills);
  const fetchProgress = useProgressStore((s) => s.fetchProgress);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthChecked(true);
      if (u) {
        await fetchProgress(u.uid);
      }
    });
    return unsub;
  }, [fetchProgress]);

  useEffect(() => {
    fetchSkills().catch(() => {});
  }, [fetchSkills]);

  // Watch for newly unlocked achievements
  const achievements = useAchievementStore((s) => s.achievements);
  const newlyUnlocked = useAchievementStore((s) => s.newlyUnlocked);
  const clearNewlyUnlocked = useAchievementStore((s) => s.clearNewlyUnlocked);
  const addToast = useToastStore((s) => s.addToast);
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const latestId = newlyUnlocked[newlyUnlocked.length - 1];
      const achievement = achievements.find((a) => a.id === latestId);
      if (achievement) {
        addToast(`Achievement unlocked: ${achievement.icon} ${achievement.name}`, 'success', 6000);
        playAchievement();
      }
      clearNewlyUnlocked();
    }
  }, [newlyUnlocked.length]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-crimson-950">
        <div className="spinner-neural" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-crimson-950">
      {/* Crimson Background */}
      <div className="crimson-bg">
        <div className="crimson-grid" />
        <div className="crimbon-particles">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`r${i}`} className="crimson-particle type-red" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`g${i}`} className="crimson-particle type-gold" />
          ))}
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-crimson-950/85 backdrop-blur-xl">
        <div className="content-area mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="everyai" className="h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            <NavLink to="/" label="Home" />
            <NavLink to="/leaderboard" label="Leaderboard" />
            {user && (
              <>
                <NavLink to="/profile" label="Profile" />
                {isAdminUser(user) && <NavLink to="/admin" label="Admin" />}
                <button
                  onClick={handleSignOut}
                  className="btn-secondary ml-2 px-3 py-1.5 text-xs"
                >
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <Link to="/auth" className="btn-primary ml-2 px-4 py-1.5 text-xs">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white sm:hidden"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-white/[0.05] bg-crimson-900 px-4 py-3 sm:hidden animate-fade-in">
            <div className="flex flex-col gap-2">
              <MobileNavLink to="/" label="Home" onClick={() => setMobileOpen(false)} />
              <MobileNavLink to="/leaderboard" label="Leaderboard" onClick={() => setMobileOpen(false)} />
              {user && (
                <>
                  <MobileNavLink to="/profile" label="Profile" onClick={() => setMobileOpen(false)} />
                  {isAdminUser(user) && <MobileNavLink to="/admin" label="Admin" onClick={() => setMobileOpen(false)} />}
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="rounded-lg px-3 py-2 text-left text-sm font-medium text-white/50 hover:bg-white/[0.04] hover:text-white font-body"
                  >
                    Sign Out
                  </button>
                </>
              )}
              {!user && (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-blood hover:bg-blood-muted transition-colors font-body"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 safe-bottom">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route
              path="/training/:skillId"
              element={
                <ProtectedRoute>
                  <Training user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile user={user} />
                </ProtectedRoute>
              }
            />
            <Route path="/auth" element={<AuthComp />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Toast notifications */}
      <ToastContainer />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-crimson-950 py-5 text-center">
        <p className="text-xs text-white/20 font-body">
          everyai &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

function NavLink({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-2 text-sm font-medium text-white/50 transition-all hover:bg-white/[0.04] hover:text-white font-body"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm font-medium text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors font-body"
    >
      {label}
    </Link>
  );
}
