import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const fileRef = useRef();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/me').then((r) => r.data),
  });

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    navigate('/login', { replace: true });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    await api.post('/user/profile-image', form);
    qc.invalidateQueries({ queryKey: ['profile'] });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Profile" />
      <div className="flex-1 flex flex-col items-center p-6 gap-6 pb-24">
        <button onClick={() => fileRef.current?.click()} className="relative mt-4">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs">
            ✏️
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {profile && (
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">{profile.name || 'No name set'}</p>
            <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
          </div>
        )}

        <Button variant="outline" onClick={handleLogout} className="w-full max-w-xs">
          Sign out
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
