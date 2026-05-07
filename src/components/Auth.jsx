import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
} from '../firebase';
import { validateUsernameFormat, checkUsernameAvailability, setInitialUsername } from '../utils/firestoreHelpers';

export default function Auth() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameCheck = async (value) => {
    setUsername(value);
    setUsernameError('');

    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    setCheckingUsername(true);
    const result = await checkUsernameAvailability(value);
    setCheckingUsername(false);
    if (!result.available) {
      setUsernameError(result.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate username
        const formatError = validateUsernameFormat(username);
        if (formatError) {
          setUsernameError(formatError);
          setLoading(false);
          return;
        }

        const avail = await checkUsernameAvailability(username);
        if (!avail.available) {
          setUsernameError(avail.message);
          setLoading(false);
          return;
        }

        // Create Firebase auth account
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Set initial username in Firestore
        await setInitialUsername(cred.user.uid, username, email);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Email already in use.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect email or password.');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 6 characters.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Try again later.');
          break;
        default:
          setError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass-card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-blood/20">
              <svg className="h-7 w-7 text-blood" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="mt-1 text-sm text-white/40 font-body">
              {isSignUp ? 'Choose a unique username to get started' : 'Continue your training journey'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-blood/20 bg-blood/10 px-4 py-3 text-sm text-blood font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className={`input-neural pr-8 ${usernameError ? 'border-neon-coral/50' : ''}`}
                    value={username}
                    onChange={(e) => handleUsernameCheck(e.target.value)}
                    placeholder="cool_nickname"
                    required
                    autoFocus
                    minLength={3}
                    maxLength={20}
                  />
                  {checkingUsername && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="spinner-neural !h-4 !w-4 !border-2" />
                    </div>
                  )}
                </div>
                {usernameError ? (
                  <p className="mt-1 text-xs text-neon-coral font-body">{usernameError}</p>
                ) : username && username.length >= 3 ? (
                  <p className="mt-1 text-xs text-emerald-400 font-body">Username available</p>
                ) : null}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">
                Email
              </label>
              <input
                type="email"
                className="input-neural"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isSignUp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5 font-body">
                Password
              </label>
              <input
                type="password"
                className="input-neural"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (isSignUp && usernameError)}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner-neural !h-4 !w-4 !border-2" />
                  Please wait...
                </span>
              ) : isSignUp ? (
                'Sign Up'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-crimson-950 px-3 text-white/30 font-body">or continue with</span>
              </div>
            </div>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="btn-secondary w-full py-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-white/40 font-body">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setUsernameError('');
              }}
              className="font-medium text-blood transition-colors hover:text-blood/80"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
