import { useState } from 'react';
import { createPlaylist, updatePlaylist } from '../services/playlistApi';

export default function PlaylistForm({ onChanged }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isPublic: true });
  const [status, setStatus] = useState(null);

  const resetForm = () => {
    setForm({ name: '', description: '', isPublic: true });
    setEditingId(null);
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!form.name.trim()) {
      setStatus({ type: 'error', text: 'Укажите название плейлиста' });
      return;
    }
    try {
      if (editingId) {
        await updatePlaylist(editingId, form);
      } else {
        await createPlaylist(form);
      }
      resetForm();
      onChanged();
      setStatus({ type: 'success', text: editingId ? 'Обновлено' : 'Создано' });
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus({ type: 'error', text: 'Ошибка сохранения' });
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
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Управление плейлистами
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </h2>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
        <div style={{ overflow: 'hidden', paddingTop: open ? '20px' : '0' }}>

          <form onSubmit={handleSubmit} className="tier-form">
            <p className="tier-form-title">{editingId ? 'Редактировать плейлист' : 'Новый плейлист'}</p>
            <div className="input-group">
              <label className="input-label">Название</label>
              <input
                className="input"
                placeholder="Мой плейлист..."
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Описание</label>
              <textarea
                className="input"
                rows={2}
                placeholder="О чём этот плейлист..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9em' }}>
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                />
                Публичный плейлист
              </label>
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
