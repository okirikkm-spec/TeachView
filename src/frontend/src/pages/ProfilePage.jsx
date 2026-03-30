import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoCard from '../components/VideoCard';
import { fetchMe, fetchUserById, updateMe, uploadAvatar, changePassword, API_BASE } from '../services/authApi';
import { fetchMyVideos, fetchUserVideos } from '../services/videoApi';
import { VideoUpload } from '../components/VideoUpload';

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
  const favoriteVideos = []; // пока пусто, в будущем загрузка из API

  const isOwnProfile = !id || (currentUser && String(currentUser.id) === String(id));

  useEffect(() => {
    setLoading(true);
    setEditOpen(false);
    setActiveTab('my');
    setSearchQuery('');

    if (!id) {
      // Свой профиль (маршрут /profile)
      Promise.all([fetchMe(), fetchMyVideos()])
        .then(([userData, videosData]) => {
          setCurrentUser(userData);
          setUser(userData);
          setVideos(videosData);
          setFormUsername(userData.username || '');
          setFormEmail(userData.email || '');
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      // Чужой или свой профиль по ID
      Promise.all([fetchMe(), fetchUserById(id), fetchUserVideos(id)])
        .then(([meData, userData, videosData]) => {
          setCurrentUser(meData);
          setUser(userData);
          setVideos(videosData);
          if (String(meData.id) === String(id)) {
            setFormUsername(userData.username || '');
            setFormEmail(userData.email || '');
          }
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
            <p className="profile-stats">{videos.length} видео</p>
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

        {isOwnProfile && (
          <VideoUpload onUploadSuccess={() =>
            fetchMyVideos().then(setVideos)
          } />
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
          </div>

          {displayedVideos.length === 0 ? (
            <p className="main-page-state">
              {searchQuery ? `Ничего не найдено по запросу «${searchQuery}»`
                : isOwnProfile
                  ? (activeTab === 'my' ? 'Вы ещё не загружали видео' : 'Нет избранных видео')
                  : 'У пользователя пока нет видео'}
            </p>
          ) : (
            <div className="profile-video-grid">
              {displayedVideos.map(v => (
                <VideoCard key={v.id} video={v} showEditButton={isOwnProfile && activeTab === 'my'} />
              ))}
            </div>
          )}
        </div>


      </div>
    </>
  );
}
