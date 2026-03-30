import { useState } from 'react';
import { uploadVideo } from '../services/videoApi';

export function VideoUpload({ onUploadSuccess }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);


  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    if (!title && file) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
    setStatus(null);
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    setThumbnailFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setThumbnailPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const addTag = (raw) => {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    if (tagInput.trim()) addTag(tagInput);
    setUploading(true);
    setStatus({ type: 'info', text: 'Обработка видео (FFmpeg)...' });
    try {
      await uploadVideo(videoFile, title, thumbnailFile, tags);
      setStatus({ type: 'success', text: 'Видео успешно загружено.' });
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setTitle('');
      setTags([]);
      setTagInput('');
      onUploadSuccess();
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Ошибка при загрузке видео.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="card">
      <h2
        className="card-title"
        onClick={() => setOpen(v => !v)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Загрузить видео
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </h2>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="input-group">
            <label className="input-label">Название</label>
            <input
              className="input"
              type="text"
              placeholder="Введите название видео..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Теги</label>
            <div className={`tag-input-wrap${uploading ? ' tag-input-wrap--disabled' : ''}`}>
              {tags.map(tag => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    className="tag-chip-remove"
                    type="button"
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                    disabled={uploading}
                  >×</button>
                </span>
              ))}
              <input
                className="tag-input"
                type="text"
                placeholder={tags.length === 0 ? 'Введите тег, нажмите Enter или запятую...' : ''}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="upload-row">

            <div className="upload-col">
              <p className="input-label" style={{ marginBottom: 8 }}>Видео файл</p>
              <label className={`file-label${videoFile ? ' has-file' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <input type="file" accept="video/*" onChange={handleVideoChange} disabled={uploading} />
                {videoFile ? videoFile.name : 'Выберите видео...'}
              </label>
            </div>

            <div className="upload-col">
              <p className="input-label" style={{ marginBottom: 8 }}>Превью (необязательно)</p>
              <label className={`file-label${thumbnailFile ? ' has-file' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <input type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploading} />
                {thumbnailFile ? thumbnailFile.name : 'Выберите изображение...'}
              </label>

              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="preview"
                  className="upload-thumb-preview"
                />
              )}
            </div>
            
          </div>
          
          

          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || !videoFile}
            style={{ marginTop: 16 }}
          >
            {uploading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Загрузка...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                </svg>
                Загрузить
              </>
            )}
          </button>

          {status && (
            <div className={`upload-status ${status.type}`}>{status.text}</div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
