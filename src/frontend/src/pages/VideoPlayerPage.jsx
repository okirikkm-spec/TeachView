import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById, getStreamUrl, recordView } from '../services/videoApi';
import { MyPlayer } from '../components/VideoJsPlayer';
import Navbar from '../components/Navbar';

export default function VideoPlayerPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [video, setVideo]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getVideoById(id)
      .then(data => {
        setVideo(data);
        setLoading(false);
      })
      .catch(err => {
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

  return (
    <>
      <Navbar />

      <div className="video-player-page">

        <div className="video-player-wrap">
          <MyPlayer 
            src={getStreamUrl(video.filePath)} 
            onViewReached={() => recordView(id)}
            />
        </div>

        <div className="video-player-info">
          <h1 className="video-player-title">{video.title}</h1>

          <div className="video-player-meta">
            <span
              className="video-player-author"
              onClick={() => navigate(`/profile/${video.uploadedById}`)}
            >
              {video.uploadedBy || 'Неизвестен'}
            </span>
            <span className="video-player-views">· {video.viewCount ?? 0} просмотров</span>
          </div>

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

      </div>
    </>
  );
}
