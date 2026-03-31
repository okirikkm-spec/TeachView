import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRelatedVideos, getThumbnailUrl } from '../services/videoApi';
import { API_BASE } from '../services/authApi';

export default function RelatedVideos({ videoId }) {
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRelatedVideos(videoId).then(setVideos);
  }, [videoId]);

  if (videos.length === 0) return null;

  return (
    <div className="related-videos">
      <h3 className="related-videos-title">Похожие видео</h3>
      <div className="related-videos-list">
        {videos.map(v => {
          const thumb = getThumbnailUrl(v.thumbnailUrl);
          const avg = v.averageRating ?? 0;
          return (
            <div key={v.id} className="related-card" onClick={() => navigate(`/video/${v.id}`)}>
              <div className="related-card-thumb">
                {thumb
                  ? <img src={thumb} alt={v.title} />
                  : <div className="related-card-thumb-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                }
              </div>
              <div className="related-card-info">
                <p className="related-card-title">{v.title}</p>
                <div className="related-card-author">
                  <span className="related-card-avatar">
                    {v.uploaderAvatarUrl
                      ? <img src={`${API_BASE}${v.uploaderAvatarUrl}`} alt="" />
                      : (v.uploadedBy?.[0]?.toUpperCase() || '?')
                    }
                  </span>
                  <span className="related-card-author-name">{v.uploadedBy || 'Неизвестен'}</span>
                </div>
                <div className="related-card-stats">
                  <span>{v.viewCount ?? 0} просмотров</span>
                  {avg > 0 && <span>★ {avg.toFixed(1)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
