import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFirebaseUser = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const res = await api.post('/auth/login', { token });
    setAuth(res.data.token, res.data.user);
    navigate('/home', { replace: true });
  };

  const signupWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await handleFirebaseUser(user);
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : 'Could not create account. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const signupWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleFirebaseUser(user);
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
        <p className="text-center text-gray-400 text-sm mb-8">Create your account</p>

        <form onSubmit={signupWithEmail} className="flex flex-col gap-4">
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
            autoComplete="new-password"
            minLength={6}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Button variant="outline" onClick={signupWithGoogle} disabled={loading} className="w-full">
          Continue with Google
        </Button>

        <p className="text-center text-sm text-gray-400 mt-6">
          Have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
