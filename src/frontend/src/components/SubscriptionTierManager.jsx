import { useState, useEffect } from 'react';
import { fetchTiers, createTier, updateTier, deleteTier } from '../services/subscriptionApi';

export default function SubscriptionTierManager({ userId }) {
  const [tiers, setTiers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', sortOrder: '' });
  const [status, setStatus] = useState(null);

  const loadTiers = () => fetchTiers(userId).then(setTiers);

  useEffect(() => { loadTiers(); }, [userId]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', sortOrder: '' });
    setEditingId(null);
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    const data = {
      name: form.name,
      description: form.description,
      price: parseInt(form.price, 10),
      sortOrder: form.sortOrder ? parseInt(form.sortOrder, 10) : 0,
    };
    if (!data.name || !data.price || data.price <= 0) {
      setStatus({ type: 'error', text: 'Укажите название и цену (> 0)' });
      return;
    }
    try {
      if (editingId) {
        await updateTier(editingId, data);
      } else {
        await createTier(data);
      }
      resetForm();
      loadTiers();
      setStatus({ type: 'success', text: editingId ? 'Обновлено' : 'Создано' });
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus({ type: 'error', text: 'Ошибка сохранения' });
    }
  };

  const handleEdit = (tier) => {
    setEditingId(tier.id);
    setForm({
      name: tier.name,
      description: tier.description || '',
      price: String(tier.price),
      sortOrder: String(tier.sortOrder || 0),
    });
    setOpen(true);
  };

  const handleDelete = async (tierId) => {
    try {
      await deleteTier(tierId);
      loadTiers();
    } catch {
      setStatus({ type: 'error', text: 'Ошибка удаления (возможно, есть активные подписки)' });
    }
  };

  return (
    <section className="card">
      <h2
        className="card-title"
        onClick={() => { setOpen(v => !v); if (!open) resetForm(); }}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        Уровни подписки
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </h2>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
        <div style={{ overflow: 'hidden', paddingTop: open ? '20px' : '0' }}>

          {tiers.length > 0 && (
            <div className="tier-list">
              {tiers.map(tier => (
                <div key={tier.id} className="tier-card">
                  <div className="tier-card-header">
                    <span className="tier-card-name">{tier.name}</span>
                    <span className="tier-card-price">{tier.price} &#8381;/мес</span>
                  </div>
                  {tier.description && <p className="tier-card-desc">{tier.description}</p>}
                  <div className="tier-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(tier)}>Изменить</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(tier.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="tier-form">
            <p className="tier-form-title">{editingId ? 'Редактировать уровень' : 'Новый уровень подписки'}</p>
            <div className="tier-form-grid">
              <div className="input-group">
                <label className="input-label">Название</label>
                <input className="input" placeholder="Базовая, Премиум..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Цена (&#8381;/мес)</label>
                <input className="input" type="number" min="1" placeholder="100" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Описание</label>
              <textarea className="input" rows={2} placeholder="Что входит в подписку..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {status && <div className={`upload-status ${status.type}`}>{status.text}</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary btn-sm">
                {editingId ? 'Сохранить' : 'Создать'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>Отмена</button>
              )}
            </div>
          </form>

        </div>
      </div>
    </section>
  );
}
