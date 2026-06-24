import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import ImageCropModal from '../../components/ImageCropModal';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const fileRef = useRef();

  const [cropSrc, setCropSrc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [upiEdit, setUpiEdit] = useState(false);
  const [upiInput, setUpiInput] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/me').then((r) => r.data),
  });

  const saveUpi = useMutation({
    mutationFn: (upiId) => api.put('/user/me', { upiId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setUpiEdit(false);
    },
  });

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    navigate('/login', { replace: true });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropDone = async (blob) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', blob, 'profile.jpg');
      await api.post('/user/profile-image', form);
      qc.invalidateQueries({ queryKey: ['profile'] });
      setCropSrc(null);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
          uploading={uploading}
        />
      )}

      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title={t('profile.title')} showBack />
        <div className="flex-1 flex flex-col items-center p-6 gap-6 pb-8">

          {/* Avatar */}
          <button onClick={() => fileRef.current?.click()} className="relative mt-4 group">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-200">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm shadow-md">
              ✏️
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {profile && (
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name || t('profile.no_name')}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{profile.email}</p>
            </div>
          )}

          {/* UPI ID */}
          <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">UPI ID</p>
            {upiEdit ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="yourname@upi"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                />
                <button
                  onClick={() => saveUpi.mutate(upiInput)}
                  disabled={saveUpi.isPending}
                  className="px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saveUpi.isPending ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setUpiEdit(false)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {profile?.upiId ? (
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{profile.upiId}</span>
                ) : (
                  <span className="text-sm text-gray-400 italic">Not set</span>
                )}
                <button
                  onClick={() => { setUpiInput(profile?.upiId || ''); setUpiEdit(true); }}
                  className="text-xs text-primary-600 dark:text-primary-400 font-semibold ml-2"
                >
                  {profile?.upiId ? 'Edit' : 'Add'}
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Others can tap to pay you directly via UPI when settling tabs.
            </p>
          </div>

          <Button variant="outline" onClick={handleLogout} className="w-full max-w-xs">
            {t('profile.sign_out')}
          </Button>
        </div>
        <BottomNav />
      </div>
    </>
  );
}
