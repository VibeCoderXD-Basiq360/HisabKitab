import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import ImageCropModal from '../../components/ImageCropModal';
import SurfaceCard from '../../components/ui/SurfaceCard';

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

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title={t('profile.title')} showBack />

        {/* Hero banner */}
        <div
          style={{
            background: 'linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)',
            width: '100%',
            height: 130,
            position: 'relative',
            flexShrink: 0,
          }}
        />

        {/* Avatar row — sits straddling the banner bottom edge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -48 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: '#E6FAF9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 0 0 3px #fff, 0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40 }}>👤</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#00C2B2',
                color: '#fff',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,194,178,0.35)',
              }}
            >
              ✏️
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {profile && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
                {profile.name || t('profile.no_name')}
              </p>
              <p style={{ fontSize: 13, color: '#B0B8C4', marginTop: 2 }}>{profile.email}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
            gap: 16,
            paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
          }}
        >
          {/* UPI ID */}
          <SurfaceCard style={{ width: '100%', maxWidth: 360 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#B0B8C4',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              UPI ID
            </p>
            {upiEdit ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  placeholder="yourname@upi"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#F0F2F7',
                    border: 'none',
                    borderRadius: 10,
                    padding: '11px 14px',
                    fontSize: 14,
                    color: '#0A0D14',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => saveUpi.mutate(upiInput)}
                  disabled={saveUpi.isPending}
                  style={{
                    background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                    color: '#fff',
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 13,
                    border: 'none',
                    padding: '0 14px',
                    cursor: saveUpi.isPending ? 'not-allowed' : 'pointer',
                    opacity: saveUpi.isPending ? 0.6 : 1,
                  }}
                >
                  {saveUpi.isPending ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setUpiEdit(false)}
                  style={{
                    background: '#F0F2F7',
                    border: 'none',
                    borderRadius: 10,
                    color: '#B0B8C4',
                    fontSize: 14,
                    padding: '0 12px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {profile?.upiId ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>{profile.upiId}</span>
                ) : (
                  <span style={{ fontSize: 14, color: '#B0B8C4', fontStyle: 'italic' }}>Not set</span>
                )}
                <button
                  onClick={() => { setUpiInput(profile?.upiId || ''); setUpiEdit(true); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00C2B2',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 8,
                    padding: 0,
                  }}
                >
                  {profile?.upiId ? 'Edit' : 'Add'}
                </button>
              </div>
            )}
            <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 8 }}>
              Others can tap to pay you directly via UPI when settling tabs.
            </p>
          </SurfaceCard>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              maxWidth: 360,
              color: '#E11D48',
              background: '#FFF1F3',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              padding: '14px 0',
              cursor: 'pointer',
            }}
          >
            {t('profile.sign_out')}
          </button>
        </div>
      </div>
    </>
  );
}
