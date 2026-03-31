import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchComments, addComment, editComment, deleteComment,
  likeComment, dislikeComment, authorLikeComment
} from '../services/videoApi';
import { API_BASE } from '../services/authApi';

export default function CommentSection({ videoId, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const loadComments = () => {
    fetchComments(videoId).then(setComments);
  };

  useEffect(() => { loadComments(); }, [videoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await addComment(videoId, text.trim(), hidden);
      setText('');
      setHidden(false);
      loadComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(videoId, commentId);
      loadComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (commentId) => {
    try {
      const updated = await likeComment(videoId, commentId);
      setComments(prev => prev.map(c => c.id === commentId ? updated : c));
    } catch (err) {
      console.error('Ошибка лайка:', err);
    }
  };

  const handleDislike = async (commentId) => {
    try {
      const updated = await dislikeComment(videoId, commentId);
      setComments(prev => prev.map(c => c.id === commentId ? updated : c));
    } catch (err) {
      console.error('Ошибка дизлайка:', err);
    }
  };

  const handleAuthorLike = async (commentId) => {
    try {
      const updated = await authorLikeComment(videoId, commentId);
      setComments(prev => prev.map(c => c.id === commentId ? updated : c));
    } catch (err) {
      console.error('Ошибка авторского лайка:', err);
    }
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">
        Комментарии
        <span className="comment-section-count">{comments.length}</span>
      </h3>

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          className="input comment-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Написать комментарий..."
          rows={2}
        />
        <div className="comment-form-actions">
          <label className="comment-hidden-toggle">
            <input
              type="checkbox"
              checked={hidden}
              onChange={e => setHidden(e.target.checked)}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            Скрытый
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
            {sending ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </form>

      <div className="comment-list">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            videoId={videoId}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            onLike={handleLike}
            onDislike={handleDislike}
            onAuthorLike={handleAuthorLike}
            onEdited={loadComments}
            navigate={navigate}
          />
        ))}
        {comments.length === 0 && (
          <p className="comment-empty">Пока нет комментариев. Будьте первым!</p>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, videoId, currentUserId, onDelete, onLike, onDislike, onAuthorLike, onEdited, navigate }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const isOwn = currentUserId === comment.userId;
  const isVideoAuthor = currentUserId === comment.videoAuthorId;

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await editComment(videoId, comment.id, editText.trim());
      setEditing(false);
      onEdited();
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = formatTimeAgo(comment.createdAt);

  return (
    <div className={`comment-item ${comment.hidden ? 'comment-item--hidden' : ''}`}>
      <div
        className="comment-avatar"
        onClick={() => navigate(`/profile/${comment.userId}`)}
      >
        {comment.userAvatarUrl
          ? <img src={`${API_BASE}${comment.userAvatarUrl}`} alt="" />
          : (comment.username?.[0]?.toUpperCase() || '?')
        }
      </div>

      <div className="comment-body">
        <div className="comment-header">
          <span
            className="comment-author"
            onClick={() => navigate(`/profile/${comment.userId}`)}
          >
            {comment.username}
            {comment.userId === comment.videoAuthorId && (
              <span className="comment-author-badge">Автор</span>
            )}
          </span>
          <span className="comment-time">{timeAgo}</span>
          {comment.edited && <span className="comment-edited">(изменён)</span>}
          {comment.hidden && (
            <span className="comment-hidden-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              Скрытый
            </span>
          )}
        </div>

        {editing ? (
          <div className="comment-edit-form">
            <textarea
              className="input comment-input"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={2}
            />
            <div className="comment-edit-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Отмена</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Сохранить</button>
            </div>
          </div>
        ) : (
          <p className="comment-text">{comment.text}</p>
        )}

        <div className="comment-actions">
          {/* Like */}
          <button
            className={`comment-action-btn ${comment.myReaction === 'like' ? 'comment-action-btn--active' : ''}`}
            onClick={() => onLike(comment.id)}
            title="Нравится"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.myReaction === 'like' ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            {comment.likes > 0 && <span>{comment.likes}</span>}
          </button>

          {/* Dislike */}
          <button
            className={`comment-action-btn ${comment.myReaction === 'dislike' ? 'comment-action-btn--active-dislike' : ''}`}
            onClick={() => onDislike(comment.id)}
            title="Не нравится"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.myReaction === 'dislike' ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
              <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
            {comment.dislikes > 0 && <span>{comment.dislikes}</span>}
          </button>

          {/* Author like */}
          {comment.authorLiked && !isVideoAuthor && (
            <span className="comment-author-like" title="Автору понравилось">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--error)" stroke="var(--error)" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </span>
          )}

          {isVideoAuthor && !isOwn && (
            <button
              className={`comment-action-btn comment-action-btn--heart ${comment.authorLiked ? 'comment-action-btn--heart-active' : ''}`}
              onClick={() => onAuthorLike(comment.id)}
              title="Авторский лайк"
            >
              <svg width="14" height="14" viewBox="0 0 24 24"
                fill={comment.authorLiked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )}

          {isOwn && !editing && (
            <button className="comment-action-btn" onClick={() => { setEditing(true); setEditText(comment.text); }} title="Редактировать">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}

          {(isOwn || isVideoAuthor) && (
            <button className="comment-action-btn comment-action-btn--delete" onClick={() => onDelete(comment.id)} title="Удалить">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн. назад`;
  return date.toLocaleDateString('ru-RU');
}
