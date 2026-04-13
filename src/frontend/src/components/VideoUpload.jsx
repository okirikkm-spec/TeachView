import { useState, useEffect, useRef } from 'react';
import { uploadVideo, getVideoStatus } from '../services/videoApi';
import { fetchTiers } from '../services/subscriptionApi';
import { fetchMe } from '../services/authApi';

export function VideoUpload({ onUploadSuccess, onClose, onVideoUploaded, onVideoStatusUpdate }) {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [requiredTierId, setRequiredTierId] = useState('');
  const [myTiers, setMyTiers] = useState([]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState(null); // 'uploading' | 'processing' | null
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchMe().then(me => fetchTiers(me.id)).then(setMyTiers).catch(() => {});
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

  const pollProcessingStatus = (videoId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { status: videoStatus } = await getVideoStatus(videoId);

        // Обновляем статус видео в списке
        if (onVideoStatusUpdate) {
          onVideoStatusUpdate(videoId, videoStatus);
        }

        if (videoStatus === 'READY') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPhase(null);
          setStatus({ type: 'success', text: 'Видео успешно обработано и готово!' });
          onUploadSuccess();
        } else if (videoStatus === 'FAILED') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPhase(null);
          setStatus({ type: 'error', text: 'Ошибка при обработке видео на сервере.' });
        }
      } catch {
        // ошибка сети — продолжаем polling
      }
    }, 3000);
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    if (tagInput.trim()) addTag(tagInput);

    setUploading(true);
    setUploadProgress(0);
    setPhase('uploading');
    setStatus(null);

    try {
      const result = await uploadVideo(
        videoFile, title, thumbnailFile, tags,
        requiredTierId || null,
        (percent) => setUploadProgress(percent),
        description
      );

      // Файл загружен — переходим к фазе обработки
      setUploadProgress(100);
      setPhase('processing');
      setStatus({ type: 'info', text: 'Файл загружен! Обработка видео на сервере...' });

      // Вызываем callback с данными видео — оно появится в списке сразу
      if (onVideoUploaded) {
        onVideoUploaded({
          ...result,
          status: 'PROCESSING',
        });
      }

      // Очищаем форму — можно загружать следующее
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setRequiredTierId('');
      setUploading(false);

      // Запускаем polling статуса
      pollProcessingStatus(result.id);

    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Ошибка при загрузке видео.' });
      setPhase(null);
      setUploadProgress(0);
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Загрузить видео
        </h2>
        {onClose && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px', fontSize: '18px', lineHeight: 1 }}
            title="Закрыть"
          >✕</button>
        )}
      </div>

      <div>
        <div>
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
            <label className="input-label">Описание</label>
            <textarea
              className="input"
              placeholder="Описание видео (необязательно)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
              style={{ resize: 'vertical', minHeight: 72 }}
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

          {myTiers.length > 0 && (
            <div className="input-group">
              <label className="input-label">Доступ по подписке</label>
              <select
                className="input"
                value={requiredTierId}
                onChange={e => setRequiredTierId(e.target.value)}
                disabled={uploading}
              >
                <option value="">Бесплатное видео (без подписки)</option>
                {myTiers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.price} &#8381;/мес</option>
                ))}
              </select>
            </div>
          )}

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
                Загрузка... {uploadProgress}%
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

          {/* Прогресс-бар */}
          {phase && (
            <div className="upload-progress-wrap">
              <div className="upload-progress-header">
                <span>{phase === 'uploading' ? 'Загрузка файла' : 'Обработка видео (FFmpeg)'}</span>
                <span>{phase === 'uploading' ? `${uploadProgress}%` : ''}</span>
              </div>
              <div className="upload-progress-track">
                <div
                  className={`upload-progress-bar ${phase === 'processing' ? 'upload-progress-bar--pulse' : ''}`}
                  style={{ width: phase === 'uploading' ? `${uploadProgress}%` : '100%' }}
                />
              </div>
            </div>
          )}

          {status && (
            <div className={`upload-status ${status.type}`}>{status.text}</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-bar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .upload-progress-wrap {
          margin-top: 12px;
        }
        .upload-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--text-muted);
        }
        .upload-progress-track {
          height: 8px;
          border-radius: 4px;
          background: var(--surface-3);
          overflow: hidden;
        }
        .upload-progress-bar {
          height: 100%;
          border-radius: 4px;
          background: var(--accent);
          transition: width 0.3s ease;
        }
        .upload-progress-bar--pulse {
          animation: pulse-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
