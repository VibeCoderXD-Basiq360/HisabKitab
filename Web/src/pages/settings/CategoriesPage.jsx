import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await update.mutateAsync({ id: editId, name: name.trim() });
      setEditId(null);
    } else {
      await create.mutateAsync({ name: name.trim() });
    }
    setName('');
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setName(c.name);
  };

  const cancel = () => {
    setEditId(null);
    setName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('categories.title')} showBack />
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Add / Edit form */}
        <SurfaceCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            {editId ? t('categories.edit_name') : t('categories.new_category')}
          </p>
          <input
            style={{ background: '#F0F2F7', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0A0D14', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            placeholder={t('categories.placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {editId && (
              <button
                onClick={cancel}
                style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#B0B8C4', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: 'none', background: name.trim() ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#E9ECF0', color: name.trim() ? '#fff' : '#B0B8C4', fontWeight: 800, fontSize: 14, cursor: name.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}
            >
              {editId ? t('common.save') : t('common.add')}
            </button>
          </div>
        </SurfaceCard>

        {/* Category list */}
        <SurfaceCard style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {isLoading && (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '24px 16px', margin: 0 }}>{t('common.loading')}</p>
          )}
          {!isLoading && categories.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '24px 16px', margin: 0 }}>{t('categories.no_categories')}</p>
          )}
          {categories.map((c, idx) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                margin: '4px 8px',
                ...(idx < categories.length - 1 ? {} : {}),
              }}
            >
              {/* Colored emoji icon box */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: c.color ? `${c.color}22` : '#F0F2F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {c.icon || '💸'}
              </div>

              {/* Name */}
              <span style={{ flex: 1, fontWeight: 700, color: '#0A0D14', fontSize: 15 }}>{c.name}</span>

              {/* Edit button */}
              <button
                onClick={() => startEdit(c)}
                style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#B0B8C4', fontSize: 16, lineHeight: 1 }}
                aria-label={t('common.edit')}
              >
                ✏️
              </button>

              {/* Delete button */}
              <button
                onClick={() => remove.mutate(c.id)}
                style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#B0B8C4', fontSize: 16, lineHeight: 1 }}
                aria-label={t('common.delete')}
              >
                🗑️
              </button>
            </div>
          ))}
        </SurfaceCard>

      </div>
    </div>
  );
}
