import { useState } from 'react';
import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from '../../hooks/usePaymentTypes';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function PaymentTypesPage() {
  const { data: types = [], isLoading } = usePaymentTypes();
  const create = useCreatePaymentType();
  const update = useUpdatePaymentType();
  const remove = useDeletePaymentType();

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

  const startEdit = (t) => {
    setEditId(t.id);
    setName(t.name);
  };

  const cancel = () => {
    setEditId(null);
    setName('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Payment Types" showBack />
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label={editId ? 'Edit name' : 'New payment type'}
              placeholder="e.g. Cash, UPI, Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          {editId && (
            <Button variant="ghost" onClick={cancel} className="shrink-0">
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={!name.trim()} className="shrink-0">
            {editId ? 'Save' : 'Add'}
          </Button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
          {isLoading && <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>}
          {!isLoading && types.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No payment types yet</p>
          )}
          {types.map((t) => (
            <div key={t.id} className="flex items-center px-4 min-h-[56px] gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: t.color ? `${t.color}25` : '#f3f4f6' }}
              >
                {t.icon || '💰'}
              </div>
              <span className="flex-1 text-sm text-gray-800">{t.name}</span>
              <button onClick={() => startEdit(t)} className="text-sm text-primary-600 px-2 py-1">
                Edit
              </button>
              <button onClick={() => remove.mutate(t.id)} className="text-sm text-red-500 px-2 py-1">
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
