import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeVideoFromPlaylist, reorderPlaylistVideos, deletePlaylist, createPlaylist } from '../services/playlistApi';
import { getThumbnailUrl } from '../services/videoApi';

export default function PlaylistManager({ playlists, isOwnProfile, onPlaylistsChange, onChanged }) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', isPublic: true });
  const [createStatus, setCreateStatus] = useState(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateStatus(null);
    if (!createForm.name.trim()) {
      setCreateStatus({ type: 'error', text: 'Укажите название плейлиста' });
      return;
    }
    try {
      await createPlaylist(createForm);
      setCreateForm({ name: '', description: '', isPublic: true });
      setShowCreateForm(false);
      if (onChanged) onChanged();
    } catch {
      setCreateStatus({ type: 'error', text: 'Ошибка сохранения' });
    }
  };

  const handleDeletePlaylist = async (e, playlistId) => {
    e.stopPropagation();
    if (!window.confirm('Удалить плейлист?')) return;
    try {
      await deletePlaylist(playlistId);
      onPlaylistsChange(prev => prev.filter(pl => pl.id !== playlistId));
      setEditingId(null);
    } catch { /* ignore */ }
  };

  const handleRemoveVideo = async (e, playlistId, videoId) => {
    e.stopPropagation();
    try {
      const updated = await removeVideoFromPlaylist(playlistId, videoId);
      onPlaylistsChange(prev => prev.map(pl => pl.id === playlistId ? updated : pl));
    } catch { /* ignore */ }
  };

  const handleDragStart = (idx) => { dragItem.current = idx; setDragIdx(idx); };
  const handleDragEnter = (idx) => { dragOverItem.current = idx; setOverIdx(idx); };

  const handleDragEnd = async (pl) => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    setDragIdx(null); setOverIdx(null);
    dragItem.current = null; dragOverItem.current = null;
    if (from === null || to === null || from === to) return;

    const reordered = [...pl.videos];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    onPlaylistsChange(prev => prev.map(p =>
      p.id === pl.id ? { ...p, videos: reordered, videoCount: reordered.length } : p
    ));
    try {
      const updated = await reorderPlaylistVideos(pl.id, reordered.map(v => v.id));
      onPlaylistsChange(prev => prev.map(p => p.id === pl.id ? updated : p));
    } catch {
      onPlaylistsChange(prev => prev.map(p => p.id === pl.id ? pl : p));
    }
  };

  if (playlists.length === 0 && !isOwnProfile) {
    return <p className="main-page-state">Нет плейлистов</p>;
  }

  const coverUrl = (pl) => {
    const first = pl.videos?.[0];
    return first ? getThumbnailUrl(first.thumbnailUrl) : null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>

      {/* Карточка «Создать плейлист» */}
      {isOwnProfile && (
        showCreateForm ? (
          <div style={{
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95em' }}>Новый плейлист</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setShowCreateForm(false); setCreateForm({ name: '', description: '', isPublic: true }); setCreateStatus(null); }}
                style={{ padding: '2px 6px', fontSize: '16px', lineHeight: 1 }}
              >✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="input-group">
                <label className="input-label">Название</label>
                <input
                  className="input"
                  placeholder="Мой плейлист..."
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Описание</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="О чём этот плейлист..."
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9em' }}>
                  <input
                    type="checkbox"
                    checked={createForm.isPublic}
                    onChange={e => setCreateForm(f => ({ ...f, isPublic: e.target.checked }))}
                  />
                  Публичный плейлист
                </label>
              </div>
              {createStatus && <div className={`upload-status ${createStatus.type}`}>{createStatus.text}</div>}
              <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '8px', width: '100%' }}>
                Создать
              </button>
            </form>
          </div>
        ) : (
          <div
            onClick={() => setShowCreateForm(true)}
            style={{
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              border: '2px dashed var(--border)',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px',
              gap: '10px',
              color: 'var(--text-muted)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ fontSize: '0.85em', fontWeight: 500 }}>Новый плейлист</span>
          </div>
        )
      )}

      {playlists.map(pl => {
        const cover = coverUrl(pl);
        const isEditing = editingId === pl.id;

        return (
          <div
            key={pl.id}
            style={{
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            {/* Обложка — клик ведёт на страницу плейлиста */}
            <div
              onClick={() => navigate(`/playlist/${pl.id}`)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '16 / 9',
                background: 'var(--surface-2)',
                overflow: 'hidden',
              }}>
                {cover ? (
                  <img
                    src={cover}
                    alt={pl.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)',
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Бейдж */}
              <div style={{
                position: 'absolute', bottom: '8px', right: '8px',
                background: 'rgba(0,0,0,0.75)', color: '#fff',
                padding: '2px 8px', borderRadius: '4px',
                fontSize: '0.75em', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                </svg>
                {pl.videoCount}
              </div>
              {/* Оверлей «Смотреть» */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
              >
                <div style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Смотреть
                </div>
              </div>
            </div>

            {/* Инфо + кнопка редактирования */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                >
                  <p style={{
                    margin: 0, fontWeight: 600, fontSize: '0.95em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    {pl.name}
                    {!pl.isPublic && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </p>
                  {pl.description && (
                    <p style={{
                      margin: '4px 0 0', fontSize: '0.8em', opacity: 0.6,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {pl.description}
                    </p>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flexShrink: 0, padding: '4px' }}
                    onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : pl.id); }}
                    title="Настройки"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Панель редактирования (внутри карточки) */}
              {isEditing && isOwnProfile && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  {pl.videos && pl.videos.length > 0 && (
                    <>
                      {pl.videos.length > 1 && (
                        <p style={{ margin: '0 0 6px', fontSize: '0.75em', opacity: 0.4 }}>
                          Перетаскивайте для изменения порядка
                        </p>
                      )}
                      <div style={{ display: 'grid', gap: '3px', marginBottom: '10px' }}>
                        {pl.videos.map((v, i) => (
                          <div
                            key={v.id}
                            draggable
                            onDragStart={(e) => { handleDragStart(i); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnter={() => handleDragEnter(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={() => handleDragEnd(pl)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '5px 6px', borderRadius: '4px',
                              background: dragIdx === i
                                ? 'rgba(99,102,241,0.15)'
                                : overIdx === i && dragIdx !== null && dragIdx !== i
                                  ? 'rgba(99,102,241,0.08)'
                                  : 'var(--surface-2)',
                              opacity: dragIdx === i ? 0.5 : 1,
                              cursor: 'grab',
                              transition: 'background 0.12s, opacity 0.12s',
                              borderLeft: overIdx === i && dragIdx !== null && dragIdx !== i
                                ? '3px solid var(--accent, #6366f1)'
                                : '3px solid transparent',
                              fontSize: '0.82em',
                            }}
                          >
                            <span style={{ opacity: 0.25, display: 'flex', flexShrink: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                              </svg>
                            </span>
                            <span style={{ opacity: 0.4, width: '16px', textAlign: 'center', flexShrink: 0 }}>{i+1}</span>
                            <div style={{
                              width: '48px', height: '27px', borderRadius: '3px',
                              overflow: 'hidden', flexShrink: 0, background: 'var(--surface)',
                            }}>
                              {getThumbnailUrl(v.thumbnailUrl) ? (
                                <img src={getThumbnailUrl(v.thumbnailUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {v.title || 'Без названия'}
                            </span>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error)', flexShrink: 0, padding: '2px' }}
                              onClick={(e) => handleRemoveVideo(e, pl.id, v.id)}
                              title="Убрать"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}
                    onClick={(e) => handleDeletePlaylist(e, pl.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Удалить плейлист
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
