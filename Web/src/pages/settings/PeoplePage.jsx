import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from '../../hooks/usePeople';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function PeoplePage() {
  const { t } = useTranslation();
  const { data: people = [], isLoading } = usePeople();
  const create = useCreatePerson();
  const update = useUpdatePerson();
  const remove = useDeletePerson();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editId, setEditId] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await update.mutateAsync({ id: editId, name: name.trim(), email: email.trim() || undefined });
      setEditId(null);
    } else {
      await create.mutateAsync({ name: name.trim(), email: email.trim() || undefined });
    }
    setName('');
    setEmail('');
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setName(p.name);
    setEmail(p.email || '');
  };

  const cancel = () => {
    setEditId(null);
    setName('');
    setEmail('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('people.title')} showBack />
      <div className="flex-1 p-4 flex flex-col gap-4">

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
          <Input
            label={editId ? t('people.edit_name') : t('people.name')}
            placeholder={t('people.name_placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Input
            label={t('people.email_optional')}
            type="email"
            placeholder={t('people.email_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            {editId && (
              <Button variant="ghost" onClick={cancel} className="shrink-0">
                {t('common.cancel')}
              </Button>
            )}
            <Button onClick={handleSave} disabled={!name.trim()} className="flex-1">
              {editId ? t('people.save_changes') : t('people.add_person')}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {isLoading && <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('common.loading')}</p>}
          {!isLoading && people.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('people.no_people')}</p>
          )}
          {people.map((p) => (
            <div key={p.id} className="flex items-center px-4 py-3 gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                {p.email && (
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                )}
                {p.linkedUserId && (
                  <p className="text-xs text-green-600 font-medium">{t('people.linked')}</p>
                )}
              </div>
              <button onClick={() => startEdit(p)} className="text-sm text-primary-600 px-2 py-1 shrink-0">
                {t('common.edit')}
              </button>
              <button onClick={() => remove.mutate(p.id)} className="text-sm text-red-500 px-2 py-1 shrink-0">
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
