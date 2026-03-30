import { useState } from 'react';
import { MyPlayer } from './VideoJsPlayer';
import { getStreamUrl } from '../services/videoApi';

export function VideoLibrary({ videos }) {
  const [currentVideo, setCurrentVideo] = useState(null);

  const handleSelect = (e) => {
    const video = videos.find(v => v.id.toString() === e.target.value);
    setCurrentVideo(video || null);
  };

  return (
    <section className="card">
      <h2 className="card-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        Видеотека
        {videos.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 400, color: 'var(--text-faint)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--border)' }}>
            {videos.length} видео
          </span>
        )}
      </h2>

      <select
        className="video-select"
        onChange={handleSelect}
        value={currentVideo ? currentVideo.id : ''}
      >
        <option value="" disabled>— Выберите видео —</option>
        {videos.map(v => (
          <option key={v.id} value={v.id}>{v.title}</option>
        ))}
      </select>

      {currentVideo ? (
        <MyPlayer key={currentVideo.id} src={getStreamUrl(currentVideo.filePath)} />
      ) : (
        <div className="player-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          Выберите видео для просмотра
        </div>
      )}
    </section>
  );
}
