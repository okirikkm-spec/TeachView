import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken, isTokenExpired, removeToken } from '../services/authApi';
import { useTheme } from '../ThemeContext';

export default function Navbar({ showSearch = false, searchQuery = '', onSearchChange }) {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  // Мобильный режим: поиск свёрнут в лупу, раскрывается по тапу
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const token = getToken();
  const isAuthenticated = !!token && !isTokenExpired(token);

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <nav className={`navbar${searchOpen ? ' navbar--search-open' : ''}`}>
      <Link
        className="navbar-logo"
        to="/"
        onDoubleClick={(e) => {
          e.preventDefault();
          toggleTheme(e.currentTarget);
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        Teach<span>View</span>
      </Link>

      {showSearch && (
        <>
          <button
            type="button"
            className="navbar-search-toggle"
            aria-label="Поиск"
            /* preventDefault — чтобы тап по лупе не снимал фокус с поля
               (иначе blur закрыл бы поиск раньше клика и он открылся бы снова) */
            onMouseDown={e => e.preventDefault()}
            onClick={() => setSearchOpen(o => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <input
            ref={searchInputRef}
            className="navbar-search"
            type="search"
            placeholder="Поиск видео..."
            value={searchQuery}
            onChange={e => onSearchChange?.(e.target.value)}
            onBlur={() => setSearchOpen(false)}
            onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur(); }}
          />
        </>
      )}

      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <Link className="btn btn-ghost btn-sm" to="/profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Профиль
            </Link>

            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost btn-sm" to="/login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Войти
            </Link>

            <Link className="btn btn-primary btn-sm" to="/register">
              Регистрация
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
