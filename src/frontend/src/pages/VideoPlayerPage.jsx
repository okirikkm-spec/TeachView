import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById, getStreamUrl, recordView, toggleFavorite } from '../services/videoApi';
import { fetchMe } from '../services/authApi';
import { MyPlayer } from '../components/VideoJsPlayer';
import Navbar from '../components/Navbar';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';
import RelatedVideos from '../components/RelatedVideos';
import VideoEditModal from '../components/VideoEditModal';

// Мемоизируем плеер, чтобы смена состояний страницы (описание, модалка)
// не вызывала его пересоздание и мигание
const StablePlayer = memo(({ src, onViewReached }) => (
  <MyPlayer src={src} onViewReached={onViewReached} />
));

export default function VideoPlayerPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [video, setVideo]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDesc, setShowDesc] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleViewReached = useCallback(() => recordView(id), [id]);

  useEffect(() => {
    setLoading(true);
    setShowDesc(false);
    Promise.all([
      getVideoById(id),
      fetchMe().catch(() => null),
    ]).then(([data, me]) => {
      setVideo(data);
      setCurrentUser(me);
      setIsFavorite(data.favorite ?? false);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <>
      <Navbar />
      <p className="main-page-state">Загрузка...</p>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <p className="main-page-state main-page-state--error">{error}</p>
    </>
  );

  const isOwner = currentUser && video && currentUser.id === video.uploadedById;

  return (
    <>
      <Navbar />

      <div className="video-player-page-layout">

        <div className="video-player-wrap">
          <StablePlayer
            src={getStreamUrl(video.filePath)}
            onViewReached={handleViewReached}
          />
        </div>

        <div className="video-player-content-row">

          <div className="video-player-main">
            <div className="video-player-info">
              <div className="video-player-title-row">
                <h1 className="video-player-title">{video.title}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {currentUser && (
                    <button
                      className={`btn btn-sm ${isFavorite ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={async () => {
                        const res = await toggleFavorite(video.id);
                        setIsFavorite(res.isFavorite);
                      }}
                      title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
                    >
                      {isFavorite ? '★ В избранном' : '☆ В избранное'}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditModalOpen(true)}
                    >
                      Редактировать
                    </button>
                  )}
                </div>
              </div>

              <div className="video-player-meta">
                <span
                  className="video-player-author"
                  onClick={() => navigate(`/profile/${video.uploadedById}`)}
                >
                  {video.uploadedBy || 'Неизвестен'}
                </span>
                <span className="video-player-views">· {video.viewCount ?? 0} просмотров</span>
              </div>

              <StarRating videoId={Number(id)} />

              {video.description && (
                <div className="video-description">
                  <button
                    className="video-description-toggle"
                    onClick={() => setShowDesc(d => !d)}
                  >
                    {showDesc ? 'Скрыть описание' : 'Показать описание'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showDesc ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showDesc && (
                    <p className="video-description-text">{video.description}</p>
                  )}
                </div>
              )}

              {video.tags?.length > 0 && (
                <div className="video-player-tags">
                  {video.tags.map(tag => (
                    <span
                      key={tag}
                      className="video-tag video-tag--link"
                      onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <CommentSection videoId={Number(id)} currentUserId={currentUser?.id} />
          </div>

          <aside className="video-player-sidebar">
            <RelatedVideos videoId={Number(id)} />
          </aside>

        </div>
      </div>

      {editModalOpen && (
        <VideoEditModal
          videoId={Number(id)}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => setVideo(updated)}
        />
      )}
    </>
  );
}
