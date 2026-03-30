import { createContext, useContext, useState, useCallback } from 'react';

const ThemeContext = createContext();

const savedTheme = (() => {
  try { return localStorage.getItem('tv-theme'); } catch { return null; }
})() || 'dark';

if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
}

let isAnimating = false;

/* ── Easing: easeInOutQuart и её обратная функция ────────── */
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeInv(y) {
  if (y <= 0) return 0;
  if (y >= 1) return 1;
  return y < 0.5
    ? Math.pow(y / 8, 0.25)
    : 1 - Math.pow(2 * (1 - y), 0.25) / 2;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(savedTheme);

  const toggleTheme = useCallback((logoEl) => {
    if (isAnimating) return;
    isAnimating = true;

    const newTheme = theme === 'dark' ? 'light' : 'dark';
    const oldBg = theme === 'dark' ? '#0d0d14' : '#f5f5fa';
    const newBg = newTheme === 'dark' ? '#0d0d14' : '#f5f5fa';

    /* ── Точка, откуда расходится новая тема ──────────────── */
    let originX, originY;
    if (newTheme === 'light') {
      if (logoEl) {
        const r = logoEl.getBoundingClientRect();
        originX = r.left + r.width / 2;
        originY = r.top  + r.height / 2;
      } else { originX = 50; originY = 30; }
    } else {
      originX = window.innerWidth;
      originY = window.innerHeight;
    }

    const maxR = Math.ceil(Math.hypot(
      Math.max(originX, window.innerWidth  - originX),
      Math.max(originY, window.innerHeight - originY),
    )) + 100;

    const duration = 680;
    const elMs     = 150;   /* длительность перехода каждого элемента */

    /* ── Задержки для всех видимых элементов (синхронизация с кругом) */
    const tracked = [];
    const allEls  = document.body.querySelectorAll('*');

    for (const el of allEls) {
      const rect = el.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;

      /* расстояние от origin до ЦЕНТРА элемента —
         так элемент меняет цвет когда круг проходит его середину,
         а не едва коснувшись края                                 */
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dist = Math.hypot(originX - cx, originY - cy);
      const delay = Math.round(duration * easeInv(Math.min(dist / maxR, 1)));

      el.style.transition = [
        `background-color ${elMs}ms ease ${delay}ms`,
        `color ${elMs}ms ease ${delay}ms`,
        `border-color ${elMs}ms ease ${delay}ms`,
        `box-shadow ${elMs}ms ease ${delay}ms`,
      ].join(',');
      tracked.push(el);
    }

    /* ── Полоса прокрутки: сразу тёмная, светлая в конце ──── */
    const darkThumb = '#26263a';
    const scrollStyle = document.createElement('style');
    scrollStyle.textContent =
      `html{scrollbar-color:${darkThumb} transparent!important}` +
      `::-webkit-scrollbar-thumb{background:${darkThumb}!important}`;
    document.head.appendChild(scrollStyle);

    setTimeout(() => { if (scrollStyle.parentNode) scrollStyle.remove(); }, duration);

    /* ── Применяем тему (запускает CSS-переходы с задержками) */
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setTheme(newTheme);
    try { localStorage.setItem('tv-theme', newTheme); } catch { /* */ }

    /* ── Анимация фона body — расходящийся круг ──────────── */
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const r = maxR * easeInOutQuart(t);

      document.body.style.background =
        `radial-gradient(circle ${r}px at ${originX}px ${originY}px, ${newBg} 100%, ${oldBg} 100%)`;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        document.body.style.background = '';
      }
    }
    requestAnimationFrame(step);

    /* ── Очистка inline-стилей после завершения ──────────── */
    setTimeout(() => {
      for (const el of tracked) el.style.transition = '';
      if (scrollStyle.parentNode) scrollStyle.remove();
      isAnimating = false;
    }, duration + elMs + 80);

  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
