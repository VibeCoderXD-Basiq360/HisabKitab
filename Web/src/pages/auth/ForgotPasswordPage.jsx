import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">{t('auth.reset_password_title')}</h1>
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm mb-8">
          {t('auth.reset_password_desc')}
        </p>

        {sent ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-2">{t('auth.reset_email_sent')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              {t('auth.reset_email_hint')}
            </p>
            <Link to="/login" className="text-primary-600 font-medium text-sm">
              {t('auth.back_to_signin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('common.loading') : t('auth.send_reset_link')}
            </Button>
          </form>
        )}

        {!sent && (
          <p className="text-center text-sm text-gray-400 mt-6">
            <Link to="/login" className="text-primary-600 font-medium">
              {t('auth.back_to_signin')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
