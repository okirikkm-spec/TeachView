import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById, getStreamUrl, getSubtitlesUrl, recordView, getThumbnailUrl } from '../services/videoApi';
import { fetchPlaylist } from '../services/playlistApi';
import { fetchMe } from '../services/authApi';
import { MyPlayer } from '../components/VideoJsPlayer';
import Navbar from '../components/Navbar';
import StarRating from '../components/StarRating';
import CommentSection from '../components/CommentSection';
import AddToPlaylist from '../components/AddToPlaylist';

const StablePlayer = memo(({ src, subtitlesUrl, onViewReached }) => (
  <MyPlayer src={src} subtitlesUrl={subtitlesUrl} onViewReached={onViewReached} />
));

export default function PlaylistPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [video, setVideo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDesc, setShowDesc] = useState(false);

  const currentVideoId = playlist?.videos?.[currentIdx]?.id;

  const handleViewReached = useCallback(() => {
    if (currentVideoId) recordView(currentVideoId);
  }, [currentVideoId]);

  // Загружаем плейлист
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPlaylist(id),
      fetchMe().catch(() => null),
    ]).then(([pl, me]) => {
      setPlaylist(pl);
      setCurrentUser(me);
      setCurrentIdx(0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Загружаем текущее видео
  useEffect(() => {
    if (!currentVideoId) return;
    setShowDesc(false);
    getVideoById(currentVideoId).then(setVideo).catch(() => {});
  }, [currentVideoId]);

  const handleNext = () => {
    if (playlist && currentIdx < playlist.videos.length - 1) {
      setCurrentIdx(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <p className="main-page-state">Загрузка...</p>
    </>
  );

  if (!playlist || !playlist.videos || playlist.videos.length === 0) return (
    <>
      <Navbar />
      <p className="main-page-state">Плейлист пуст</p>
    </>
  );

  return (
    <>
      <Navbar />

      <div className="video-player-page-layout">

        <div className="video-player-wrap">
          {video && (
            <StablePlayer
              src={getStreamUrl(video.filePath)}
              subtitlesUrl={getSubtitlesUrl(video.filePath)}
              onViewReached={handleViewReached}
            />
          )}
        </div>

        <div className="video-player-content-row">

          <div className="video-player-main">
            {video && (
              <div className="video-player-info">
                <div className="video-player-title-row">
                  <h1 className="video-player-title">{video.title}</h1>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Навигация по плейлисту */}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handlePrev}
                      disabled={currentIdx === 0}
                      title="Предыдущее"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span style={{ fontSize: '0.85em', opacity: 0.6 }}>
                      {currentIdx + 1} / {playlist.videos.length}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleNext}
                      disabled={currentIdx === playlist.videos.length - 1}
                      title="Следующее"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    {currentUser && <AddToPlaylist videoId={video.id} />}
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

                <StarRating videoId={currentVideoId} />

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
              </div>
            )}

            {video && <CommentSection videoId={currentVideoId} currentUserId={currentUser?.id} />}
          </div>

          {/* Сайдбар — плейлист */}
          <aside className="video-player-sidebar">
            <div className="related-videos">
              <h3 className="related-videos-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                {playlist.name}
                <span style={{ fontSize: '0.8em', opacity: 0.5, fontWeight: 400 }}>
                  ({playlist.videoCount} видео)
                </span>
              </h3>

              <div className="related-videos-list">
                {playlist.videos.map((v, i) => {
                  const thumb = getThumbnailUrl(v.thumbnailUrl, v.updatedAt);
                  const isActive = i === currentIdx;
                  return (
                    <div
                      key={v.id}
                      className={`related-card ${isActive ? 'related-card--active' : ''}`}
                      onClick={() => setCurrentIdx(i)}
                      style={{
                        background: isActive ? 'var(--accent-light, rgba(99,102,241,0.1))' : undefined,
                        borderLeft: isActive ? '3px solid var(--accent, #6366f1)' : '3px solid transparent',
                      }}
                    >
                      <div className="related-card-thumb">
                        {thumb
                          ? <img src={thumb} alt={v.title} />
                          : <div className="related-card-thumb-placeholder">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="1.5">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            </div>
                        }
                        {/* Номер */}
                        <div style={{
                          position: 'absolute', top: '4px', left: '4px',
                          background: isActive ? 'var(--accent, #6366f1)' : 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          width: '20px', height: '20px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7em', fontWeight: 600,
                        }}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="related-card-info">
                        <p className="related-card-title" style={{ fontWeight: isActive ? 600 : 500 }}>
                          {v.title || 'Без названия'}
                        </p>
                        <div className="related-card-stats">
                          <span>{v.uploadedBy}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </>
  );
}
