import { useNavigate, Link } from 'react-router-dom';
import { getThumbnailUrl } from '../services/videoApi';
import { API_BASE } from '../services/authApi';


function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoCard({ video, showEditButton = false }) {
  const navigate = useNavigate();

  const title    = video.title || video.filename?.replace(/\.[^.]+$/, '') || 'Без названия';
  const views    = (video.viewCount ?? 0) + ' просмотров';
  const duration = formatDuration(video.duration);
  const thumb    = getThumbnailUrl(video.thumbnailUrl);

  const handleClick = () => {
    navigate(`/video/${video.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    console.log('Редактировать:', video.id);
  };

  return (
    <div className="video-card" onClick={handleClick}>

      <div className="video-card-thumb">
        {thumb ? (
          <img src={thumb} alt={title} className="video-card-img" />
        ) : (
          <div className="video-card-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
        )}

        {duration && (
          <span className="video-card-duration">{duration}</span>
        )}

        {showEditButton && (
          <button className="video-card-edit" onClick={handleEdit} title="Редактировать">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                       a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                       A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                       l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                       A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                       l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                       a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                       l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                       a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>


      <div className="video-card-info">
        <p className="video-card-title">{title}</p>
        <div className="video-card-meta">
          <span className="video-card-author-avatar">
            {video.uploaderAvatarUrl
              ? <img src={`${API_BASE}${video.uploaderAvatarUrl}`} alt="" />
              : (video.uploadedBy?.[0]?.toUpperCase() || '?')
            }
          </span>
          <Link
            to={`/profile/${video.uploadedById}`}
            className="video-card-author"
            onClick={e => e.stopPropagation()}
          >
            {video.uploadedBy || 'Неизвестен'}
          </Link>
          {' · '}{views}
        </div>
      </div>

    </div>
  );
}
