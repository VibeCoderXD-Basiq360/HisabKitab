import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Reset password</h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          We'll send a reset link to your email
        </p>

        {sent ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-2">Email sent!</p>
            <p className="text-sm text-gray-400 mb-6">
              Check your inbox and follow the link to reset your password.
            </p>
            <Link to="/login" className="text-primary-600 font-medium text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-gray-400 mt-6">
            <Link to="/login" className="text-primary-600 font-medium">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
