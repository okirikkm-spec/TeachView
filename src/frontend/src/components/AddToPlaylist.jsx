import { useState, useEffect, useRef } from 'react';
import { fetchMyPlaylists, addVideoToPlaylist, createPlaylist } from '../services/playlistApi';

export default function AddToPlaylist({ videoId }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [status, setStatus] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      fetchMyPlaylists().then(setPlaylists);
    }
  }, [open]);

  // Закрыть при клике вне
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
        setStatus(null);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAdd = async (playlistId) => {
    try {
      const updated = await addVideoToPlaylist(playlistId, videoId);
      setPlaylists(prev => prev.map(pl => pl.id === playlistId ? updated : pl));
      setStatus({ type: 'success', playlistId, text: 'Добавлено' });
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus({ type: 'error', playlistId, text: 'Уже в плейлисте' });
      setTimeout(() => setStatus(null), 2000);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const pl = await createPlaylist({ name: newName, description: '', isPublic: true });
      await addVideoToPlaylist(pl.id, videoId);
      setNewName('');
      setCreating(false);
      setPlaylists(await fetchMyPlaylists());
      setStatus({ type: 'success', playlistId: pl.id, text: 'Создано и добавлено' });
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus({ type: 'error', text: 'Ошибка' });
    }
  };

  // Проверить есть ли видео уже в плейлисте
  const isVideoInPlaylist = (pl) => {
    return pl.videos && pl.videos.some(v => v.id === parseInt(videoId));
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        title="Добавить в плейлист"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span style={{ marginLeft: '6px' }}>В плейлист</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          minWidth: '240px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          padding: '8px 0',
        }}>
          {playlists.length === 0 && !creating && (
            <p style={{ padding: '8px 16px', margin: 0, opacity: 0.5, fontSize: '0.85em' }}>
              Нет плейлистов
            </p>
          )}

          {playlists.map(pl => (
            <div
              key={pl.id}
              onClick={() => !isVideoInPlaylist(pl) && handleAdd(pl.id)}
              style={{
                padding: '8px 16px',
                cursor: isVideoInPlaylist(pl) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: isVideoInPlaylist(pl) ? 0.5 : 1,
                fontSize: '0.9em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isVideoInPlaylist(pl)) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pl.name}
                <span style={{ opacity: 0.5, marginLeft: '6px', fontSize: '0.85em' }}>
                  ({pl.videoCount})
                </span>
              </span>
              {isVideoInPlaylist(pl) && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {status && status.playlistId === pl.id && (
                <span style={{ fontSize: '0.8em', color: status.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
                  {status.text}
                </span>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          {!creating ? (
            <div
              onClick={() => setCreating(true)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9em',
                color: 'var(--accent)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Создать плейлист
            </div>
          ) : (
            <form onSubmit={handleCreate} style={{ padding: '8px 12px', display: 'flex', gap: '6px' }}>
              <input
                className="input"
                placeholder="Название..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                style={{ fontSize: '0.85em', padding: '6px 10px' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}