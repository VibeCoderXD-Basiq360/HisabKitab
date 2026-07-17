import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { useSharedTabs } from '../../hooks/useSharedTabs';
import { useTransferExpense } from '../../hooks/useExpenses';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TransferExpenseSheet({ expense, onClose }) {
  const [personId, setPersonId] = useState('');
  const [transferType, setTransferType] = useState('FULL');
  const [customRatio, setCustomRatio] = useState(50);
  const [tabId, setTabId] = useState('');
  const [error, setError] = useState('');

  const { data: people = [] } = usePeople();
  const { data: tabs = [] } = useSharedTabs();
  const transfer = useTransferExpense();

  const activeTabs = tabs.filter((t) => t.status === 'ACTIVE');
  const amount = Number(expense.amount);
  const selectedPerson = people.find((p) => p.id === personId);
  const hasExistingSplit = expense.splits?.some((s) => ['PENDING', 'PAYMENT_REQUESTED'].includes(s.status));

  const theirShare =
    transferType === 'FULL' ? amount
    : transferType === 'SPLIT' ? Math.round((amount / 2) * 100) / 100
    : Math.round(amount * (Math.min(99, Math.max(1, customRatio)) / 100) * 100) / 100;
  const myShare = Math.round((amount - theirShare) * 100) / 100;

  const handleTransfer = async () => {
    if (!personId) { setError('Please select a person'); return; }
    setError('');
    try {
      await transfer.mutateAsync({
        id: expense.id,
        personId,
        transferType,
        customRatio: transferType === 'CUSTOM' ? customRatio : undefined,
        tabId: tabId || undefined,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Transfer failed');
    }
  };

  const inputStyle = {
    width: '100%', minHeight: 48, padding: '0 16px', borderRadius: 12,
    border: '1.5px solid #E9ECF0', background: '#fff', fontSize: 15,
    color: '#0A0D14', outline: 'none', fontFamily: 'inherit',
    appearance: 'none', boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(10,13,20,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:'24px 24px 0 0', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 6px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'#E9ECF0' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px 14px', borderBottom:'1px solid #F0F2F7' }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:800, color:'#0A0D14', margin:0 }}>Transfer Expense</h2>
            <p style={{ fontSize:12, color:'#B0B8C4', margin:'3px 0 0' }}>Assign this cost — they'll owe you</p>
          </div>
          <button onClick={onClose} style={{ fontSize:24, color:'#B0B8C4', background:'none', border:'none', cursor:'pointer', lineHeight:1, padding:4 }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'16px 20px', overflowY:'auto' }}>

          {/* Expense summary chip */}
          <div style={{ display:'flex', alignItems:'center', gap:12, background:'#F0F2F7', borderRadius:14, padding:'12px 14px' }}>
            <div style={{
              width:36, height:36, borderRadius:'50%', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
              background: expense.category?.color ? `${expense.category.color}25` : '#E9ECF0',
            }}>
              {expense.category?.icon || '💸'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'#0A0D14', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {expense.title || 'Expense'}
              </p>
              <p style={{ fontSize:12, color:'#B0B8C4', margin:'2px 0 0' }}>
                {expense.category?.name} · {expense.paymentType?.name}
              </p>
            </div>
            <p style={{ fontSize:15, fontWeight:800, color:'#0A0D14', flexShrink:0 }}>{fmt(amount)}</p>
          </div>

          {/* Existing split warning */}
          {hasExistingSplit && (
            <div style={{ background:'#FFFBEB', border:'1.5px solid #F59E0B', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ marginTop:1 }}>⚠️</span>
              <p style={{ fontSize:12, color:'#92400E', margin:0 }}>
                This expense already has an active split. Transferring will replace it.
              </p>
            </div>
          )}

          {/* Who to transfer to */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Who will owe you?
            </label>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} style={inputStyle}>
              <option value="">Select a person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* How much they owe */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              How much do they owe?
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { key: 'FULL', label: 'Full amount', sub: 'They owe everything' },
                { key: 'SPLIT', label: 'Split 50/50', sub: 'You share equally' },
                { key: 'CUSTOM', label: 'Custom %', sub: 'Set their share' },
              ].map(({ key, label, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTransferType(key)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    padding:'10px 6px', borderRadius:12, border:'none', textAlign:'center', cursor:'pointer',
                    background: transferType === key ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#F0F2F7',
                    transition:'background 0.15s',
                  }}
                >
                  <span style={{ fontSize:11, fontWeight:700, color: transferType === key ? '#fff' : '#0A0D14', lineHeight:1.3 }}>{label}</span>
                  <span style={{ fontSize:10, color: transferType === key ? 'rgba(255,255,255,0.75)' : '#B0B8C4', marginTop:2, lineHeight:1.3 }}>{sub}</span>
                </button>
              ))}
            </div>

            {/* Custom ratio slider */}
            {transferType === 'CUSTOM' && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#374151' }}>
                  <span>Their share: <strong style={{ color:'#00C2B2' }}>{customRatio}%</strong></span>
                  <span>Your share: <strong>{100 - customRatio}%</strong></span>
                </div>
                <input
                  type="range" min={1} max={99} value={customRatio}
                  onChange={(e) => setCustomRatio(Number(e.target.value))}
                  style={{ width:'100%', accentColor:'#00C2B2' }}
                />
              </div>
            )}
          </div>

          {/* Balance impact preview */}
          {personId && (
            <div style={{
              borderRadius:12, border:'1.5px solid #E6FAF9', padding:'12px 14px',
              background: theirShare === amount ? '#FFFBEB' : '#E6FAF9',
              display:'flex', flexDirection:'column', gap:6,
            }}>
              <p style={{ fontSize:11, fontWeight:800, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>After transfer</p>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#374151' }}>{selectedPerson?.name} owes you</span>
                <span style={{ fontSize:13, fontWeight:800, color:'#F97316' }}>{fmt(theirShare)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, color:'#374151' }}>Your net expense</span>
                <span style={{ fontSize:13, fontWeight:800, color: myShare === 0 ? '#059669' : '#0A0D14' }}>
                  {myShare === 0 ? 'Nothing (fully recovered)' : fmt(myShare)}
                </span>
              </div>
              {!selectedPerson?.linkedUserId && (
                <p style={{ fontSize:11, color:'#B0B8C4', margin:0 }}>
                  {selectedPerson?.name} is not on the app — the debt will show in your Balances page only.
                </p>
              )}
            </div>
          )}

          {/* Optional tab link */}
          {activeTabs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Also add to Shared Tab <span style={{ fontSize:11, fontWeight:500, color:'#B0B8C4', textTransform:'none' }}>(optional)</span>
              </label>
              <select value={tabId} onChange={(e) => setTabId(e.target.value)} style={inputStyle}>
                <option value="">Don't link to a tab</option>
                {activeTabs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {tabId && (
                <p style={{ fontSize:12, color:'#00C2B2', margin:0, display:'flex', alignItems:'center', gap:4 }}>
                  🤝 This will also appear in the tab and update the shared balance.
                </p>
              )}
            </div>
          )}

          {error && (
            <p style={{ fontSize:13, color:'#E11D48', textAlign:'center', margin:0 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', paddingBottom:'calc(12px + env(safe-area-inset-bottom))', borderTop:'1px solid #F0F2F7', flexShrink:0 }}>
          <button
            onClick={handleTransfer}
            disabled={!personId || transfer.isPending}
            style={{
              width:'100%', height:52, borderRadius:12, border:'none', cursor:'pointer',
              background: (!personId || transfer.isPending) ? '#E9ECF0' : 'linear-gradient(135deg,#00C2B2,#009E90)',
              color: (!personId || transfer.isPending) ? '#B0B8C4' : '#fff',
              fontSize:15, fontWeight:800, fontFamily:'inherit', transition:'background 0.15s',
            }}
          >
            {transfer.isPending ? 'Transferring…' : `Transfer ${personId ? fmt(theirShare) : ''}${personId && selectedPerson ? ` to ${selectedPerson.name}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
