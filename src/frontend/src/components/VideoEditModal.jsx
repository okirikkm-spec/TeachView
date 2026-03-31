import { useState, useEffect, useRef } from 'react';
import { updateVideo, getVideoById, getThumbnailUrl } from '../services/videoApi';

export default function VideoEditModal({ videoId, onClose, onSaved }) {
  const [video, setVideo] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    getVideoById(videoId).then(data => {
      setVideo(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setTags(data.tags || []);
      if (data.thumbnailUrl) {
        setThumbPreview(getThumbnailUrl(data.thumbnailUrl));
      }
    });
  }, [videoId]);

  useEffect(() => {
    return () => { if (thumbPreview && thumbnailFile) URL.revokeObjectURL(thumbPreview); };
  }, [thumbPreview, thumbnailFile]);

  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const result = await updateVideo(videoId, {
        title,
        description,
        tags,
        thumbnail: thumbnailFile,
      });
      setStatus('ok');
      if (onSaved) onSaved(result);
      setTimeout(() => onClose(), 600);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (!video) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <p className="main-page-state">Загрузка...</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Редактировать видео</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="input-group">
            <label className="input-label">Название</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название видео"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Описание</label>
            <textarea
              className="input edit-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание видео..."
              rows={4}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Теги</label>
            <div className="tag-input-wrap">
              {tags.map(tag => (
                <span key={tag} className="tag-chip">
                  #{tag}
                  <button
                    type="button"
                    className="tag-chip-remove"
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                  >&times;</button>
                </span>
              ))}
              <input
                className="tag-input"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? "Введите тег и нажмите Enter" : ""}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Превью</label>
            <div className="edit-thumb-row">
              {thumbPreview && (
                <img src={thumbPreview} alt="preview" className="upload-thumb-preview" />
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                Сменить превью
              </button>
              <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleThumbnailChange} />
            </div>
          </div>

          {status === 'ok'    && <p className="upload-status success">Сохранено!</p>}
          {status === 'error' && <p className="upload-status error">Ошибка сохранения</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
