import { useNavigate, Link } from 'react-router-dom';
import { getThumbnailUrl } from '../services/videoApi';
import { API_BASE } from '../services/authApi';


function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoCard({ video, showEditButton = false, onEdit }) {
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
    if (onEdit) onEdit(video.id);
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
