import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFirebaseLogin = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const res = await api.post('/auth/login', { token });
    setAuth(res.data.token, res.data.user);
    navigate('/home', { replace: true });
  };

  const loginWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await handleFirebaseLogin(user);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleFirebaseLogin(user);
    } catch {
      setError('Google sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-1">HisabKitab</h1>
        <p className="text-center text-gray-400 text-sm mb-8">Track your expenses</p>

        <form onSubmit={loginWithEmail} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Button variant="outline" onClick={loginWithGoogle} disabled={loading} className="w-full">
          Continue with Google
        </Button>

        <p className="text-center text-sm text-gray-400 mt-4">
          <Link to="/forgot-password" className="text-primary-600 font-medium">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm text-gray-400 mt-3">
          No account?{' '}
          <Link to="/signup" className="text-primary-600 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
