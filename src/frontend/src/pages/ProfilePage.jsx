import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoCard from '../components/VideoCard';
import { fetchMe, fetchUserById, updateMe, uploadAvatar, changePassword, API_BASE } from '../services/authApi';
import { fetchMyVideos, fetchUserVideos, fetchFavorites, deleteVideo } from '../services/videoApi';
import { VideoUpload } from '../components/VideoUpload';
import VideoEditModal from '../components/VideoEditModal';
import SubscriptionTierManager from '../components/SubscriptionTierManager';
import SubscriptionPanel from '../components/SubscriptionPanel';
import PlaylistManager from '../components/PlaylistManager';
import { fetchSubscriberCount } from '../services/subscriptionApi';
import { fetchMyPlaylists, fetchAuthorPlaylists } from '../services/playlistApi';

export default function ProfilePage() {
  const { id } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser]         = useState(null);
  const [videos, setVideos]     = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading]   = useState(true);

  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail]       = useState('');
  const [saveStatus, setSaveStatus]     = useState(null);

  const [formOldPassword, setFormOldPassword]         = useState('');
  const [formNewPassword, setFormNewPassword]         = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus]           = useState(null);

  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl]               = useState(null);

  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [editVideoId, setEditVideoId] = useState(null);
  const [favoriteVideos, setFavoriteVideos] = useState([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [playlists, setPlaylists] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const isOwnProfile = !id || (currentUser && String(currentUser.id) === String(id));

  useEffect(() => {
    setLoading(true);
    setEditOpen(false);
    setActiveTab('my');
    setSearchQuery('');

    if (!id) {
      Promise.all([fetchMe(), fetchMyVideos(), fetchFavorites()])
        .then(([userData, videosData, favData]) => {
          setCurrentUser(userData);
          setUser(userData);
          setVideos(videosData);
          setFavoriteVideos(favData);
          setFormUsername(userData.username || '');
          setFormEmail(userData.email || '');
          fetchSubscriberCount(userData.id).then(setSubscriberCount).catch(() => {});
          fetchMyPlaylists().then(setPlaylists).catch(() => {});
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      Promise.all([fetchMe(), fetchUserById(id), fetchUserVideos(id)])
        .then(([meData, userData, videosData]) => {
          setCurrentUser(meData);
          setUser(userData);
          setVideos(videosData);
          if (String(meData.id) === String(id)) {
            setFormUsername(userData.username || '');
            setFormEmail(userData.email || '');
            fetchFavorites().then(setFavoriteVideos).catch(() => {});
          }
          fetchSubscriberCount(userData.id).then(setSubscriberCount).catch(() => {});
          const isOwn = String(meData.id) === String(id);
          (isOwn ? fetchMyPlaylists() : fetchAuthorPlaylists(id)).then(setPlaylists).catch(() => {});
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      let updated = await updateMe({ username: formUsername, email: formEmail });
      if (pendingAvatarFile) {
        updated = await uploadAvatar(pendingAvatarFile);
        setPendingAvatarFile(null);
        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      }
      setUser(updated);
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingAvatarFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (formNewPassword !== formConfirmPassword) {
      setPasswordStatus('mismatch');
      return;
    }
    if (formNewPassword.length < 3) {
      setPasswordStatus('short');
      return;
    }
    try {
      await changePassword(formOldPassword, formNewPassword);
      setFormOldPassword('');
      setFormNewPassword('');
      setFormConfirmPassword('');
      setPasswordStatus('ok');
      setTimeout(() => setPasswordStatus(null), 2000);
    } catch (err) {
      setPasswordStatus(err.message || 'error');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Удалить видео? Это действие необратимо.')) return;
    try {
      await deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (err) {
      alert(err.message || 'Ошибка при удалении видео');
    }
  };

  const handleVideoUploaded = (videoData) => {
    setVideos(prev => [videoData, ...prev]);
  };

  const handleVideoStatusUpdate = (videoId, newStatus) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: newStatus } : v));
  };

  const avatarLetter = user?.username?.[0]?.toUpperCase() || '?';

  if (loading) return (
    <>
      <Navbar />
      <p className="main-page-state">Загрузка...</p>
    </>
  );

  const handleTabChange = (tab) => { setActiveTab(tab); setSearchQuery(''); };

  const sourceVideos = activeTab === 'my' ? videos : favoriteVideos;

  const displayedVideos = searchQuery
      ? sourceVideos.filter(v => {
          const q = searchQuery.toLowerCase();
          return (v.title || v.filename || '').toLowerCase().includes(q)
              || (v.uploadedBy || '').toLowerCase().includes(q)
              || (v.tags || []).some(t => t.toLowerCase().includes(q));
        })
      : sourceVideos;


  return (
    <>
      <Navbar showSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="profile-page">

        <div className="profile-header card">
          <div className="profile-avatar">
            {user?.avatarUrl
              ? <img src={`${API_BASE}${user.avatarUrl}`} alt={user.username} />
              : avatarLetter
            }
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user?.username}</h1>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-stats">{videos.length} видео · {subscriberCount} подписчиков</p>
          </div>
          {isOwnProfile && (
            <button
              className="btn btn-secondary btn-sm profile-edit-btn"
              onClick={() => { setEditOpen(o => !o); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } setPendingAvatarFile(null); }}
            >
              {editOpen ? 'Отмена' : 'Редактировать профиль'}
            </button>
          )}
        </div>

        {isOwnProfile && editOpen && (
          <div className="profile-edit-form card">
            <p className="card-title">Настройки профиля</p>
            <div className="profile-edit-grid">

              {/* Левая колонка: аватарка + основная инфо */}
              <div className="profile-edit-section">
                <p className="profile-edit-section-title">Основная информация</p>

                <div className="profile-avatar-upload-wrap">
                  <div
                    className="profile-avatar profile-avatar-upload"
                    onClick={() => fileInputRef.current.click()}
                    title="Сменить аватарку"
                  >
                    {previewUrl
                      ? <img src={previewUrl} alt="preview" />
                      : user?.avatarUrl
                        ? <img src={`${API_BASE}${user.avatarUrl}`} alt={user.username} />
                        : avatarLetter
                    }
                    <div className="profile-avatar-overlay">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                  />
                </div>

                <form onSubmit={handleSave}>
                  <div className="input-group">
                    <label className="input-label">Имя пользователя</label>
                    <input
                      className="input"
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email</label>
                    <input
                      className="input"
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  {saveStatus === 'ok'    && <p className="upload-status success">Сохранено</p>}
                  {saveStatus === 'error' && <p className="upload-status error">Ошибка сохранения</p>}
                  <button type="submit" className="btn btn-primary">Сохранить</button>
                </form>
              </div>

              {/* Правая колонка: смена пароля */}
              <div className="profile-edit-section">
                <p className="profile-edit-section-title">Смена пароля</p>
                <form onSubmit={handlePasswordChange}>
                  <div className="input-group">
                    <label className="input-label">Текущий пароль</label>
                    <input
                      className="input"
                      type="password"
                      value={formOldPassword}
                      onChange={e => setFormOldPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Новый пароль</label>
                    <input
                      className="input"
                      type="password"
                      value={formNewPassword}
                      onChange={e => setFormNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Повторите новый пароль</label>
                    <input
                      className="input"
                      type="password"
                      value={formConfirmPassword}
                      onChange={e => setFormConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  {passwordStatus === 'ok'       && <p className="upload-status success">Пароль изменён</p>}
                  {passwordStatus === 'mismatch' && <p className="upload-status error">Пароли не совпадают</p>}
                  {passwordStatus === 'short'    && <p className="upload-status error">Минимум 3 символа</p>}
                  {passwordStatus && passwordStatus !== 'ok' && passwordStatus !== 'mismatch' && passwordStatus !== 'short' &&
                    <p className="upload-status error">{passwordStatus}</p>}
                  <button type="submit" className="btn btn-primary">Изменить пароль</button>
                </form>
              </div>

            </div>
          </div>
        )}

        {isOwnProfile && currentUser && (
          <SubscriptionTierManager userId={currentUser.id} />
        )}

        {!isOwnProfile && currentUser && user && (
          <SubscriptionPanel authorId={user.id} currentUserId={currentUser.id} />
        )}

        <div className="profile-videos">
          <div className="main-page-controls">
            <button className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleTabChange('my')}>
              {isOwnProfile ? 'Мои видео' : 'Видео'}
            </button>
            {isOwnProfile && (
              <button className={`btn btn-sm ${activeTab === 'favorites' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleTabChange('favorites')}>Избранное</button>
            )}
            <button className={`btn btn-sm ${activeTab === 'playlists' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleTabChange('playlists')}>Плейлисты</button>
          </div>

          {activeTab === 'playlists' ? (
            <PlaylistManager
              playlists={playlists}
              isOwnProfile={isOwnProfile}
              onPlaylistsChange={setPlaylists}
              onChanged={() => fetchMyPlaylists().then(setPlaylists)}
            />
          ) : (
            <div className="profile-video-grid">
              {isOwnProfile && activeTab === 'my' && (
                <div
                  className="video-card"
                  onClick={() => setUploadModalOpen(true)}
                  style={{
                    border: '2px dashed var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: 'var(--text-muted)',
                    minHeight: '160px',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span style={{ fontSize: '0.85em', fontWeight: 500 }}>Загрузить видео</span>
                </div>
              )}
              {displayedVideos.length === 0 && (searchQuery || !(isOwnProfile && activeTab === 'my')) ? (
                <p className="main-page-state" style={{ gridColumn: '1 / -1' }}>
                  {searchQuery ? `Ничего не найдено по запросу «${searchQuery}»`
                    : isOwnProfile
                      ? 'Нет избранных видео'
                      : 'У пользователя пока нет видео'}
                </p>
              ) : (
                displayedVideos.map(v => (
                  <VideoCard key={v.id} video={v} showEditButton={isOwnProfile && activeTab === 'my'} onEdit={(vid) => setEditVideoId(vid)} onDelete={handleDeleteVideo} />
                ))
              )}
            </div>
          )}
        </div>


      </div>

      {editVideoId && (
        <VideoEditModal
          videoId={editVideoId}
          onClose={() => setEditVideoId(null)}
          onSaved={() => {
            setEditVideoId(null);
            (isOwnProfile && !id ? fetchMyVideos() : fetchUserVideos(id)).then(setVideos);
          }}
        />
      )}

      {uploadModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setUploadModalOpen(false); }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <VideoUpload
              onUploadSuccess={() => {
                setUploadModalOpen(false);
              }}
              onClose={() => setUploadModalOpen(false)}
              onVideoUploaded={handleVideoUploaded}
              onVideoStatusUpdate={handleVideoStatusUpdate}
            />
          </div>
        </div>
      )}
    </>
  );
}
