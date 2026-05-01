'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '@videojs/react/video/skin.css';
import { createPlayer, videoFeatures, useMedia } from '@videojs/react';
import { VideoSkin } from '@videojs/react/video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { serializeTimeRanges } from '@videojs/utils/dom';
import Hls from 'hls.js';


const safeBufferFeature = {
  name: 'buffer',
  state: () => ({ buffered: [], seekable: [] }),
  attach({ target, signal, set }) {
    const { media } = target;
    const sync = () => {
      if (!media.target) return;
      set({
        buffered: serializeTimeRanges(media.buffered),
        seekable: serializeTimeRanges(media.seekable),
      });
    };
    sync();
    media.addEventListener('progress', sync, { signal });
    media.addEventListener('emptied',  sync, { signal });
  },
};

const safeVideoFeatures = videoFeatures.map(f =>
  f.name === 'buffer' ? safeBufferFeature : f,
);

const Player = createPlayer({ features: safeVideoFeatures });

const CUSTOM_CSS = `
  .media-default-skin
    .media-button.media-button--icon:not(.media-button--play):not(.media-button--fullscreen):not(.media-button--quality):not(.media-button--rate):not(.media-button--volume):not(.media-button--subtitles) {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  .media-button--playback-rate {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  /* Fully remove seek/mute/captions and volume popover — replaced by custom controls */
  .media-default-skin .media-button--seek,
  .media-default-skin .media-button--mute,
  .media-default-skin .media-button--captions,
  .media-default-skin .media-popover--volume {
    display: none !important;
  }

  /* Inline volume (mute icon + horizontal slider) */
  .media-volume-inline {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 0.25rem;
  }
  .media-volume-slider {
    width: 4.5rem;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    padding: 0;
    margin: 0;
  }
  .media-volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: oklch(1 0 0);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 0 1px oklch(0 0 0 / 0.2);
  }
  .media-volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: oklch(1 0 0);
    cursor: pointer;
    border: none;
  }
  .media-volume-slider::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: transparent;
  }
  @container media-controls (width < 28rem) {
    .media-volume-slider { display: none; }
  }

  /* Subtitles button (non-functional placeholder) */
  .media-button--subtitles .media-icon {
    width: 1.5rem;
    height: 1.5rem;
    filter: drop-shadow(0 1px 0 var(--media-controls-current-shadow-color, oklch(0 0 0 / 0.25)));
  }

  .media-quality-item:hover {
    background: oklch(1 0 0 / 0.15) !important;
  }

  /* Quality selector — skips fullscreen (pos 1) and subtitles (pos 2), sits at pos 3 */
  .media-quality-wrapper {
    position: absolute;
    bottom: calc(0.75rem + 0.175rem);
    right: calc(0.75rem + 0.175rem + 2 * (2.125rem + 0.075rem));
    width: 2.125rem;
    height: 2.125rem;
    z-index: 15;
  }
  @container media-root (width > 40rem) {
    .media-quality-wrapper {
      bottom: calc(0.75rem + 0.25rem);
      right: calc(0.75rem + 0.25rem + 2 * (2.125rem + 0.125rem));
    }
  }

  /* Playback rate wrapper — overlays native playback-rate slot (pos 3) */
  .media-rate-wrapper {
    position: absolute;
    bottom: calc(0.75rem + 0.175rem);
    right: calc(0.75rem + 0.175rem + 3 * (2.125rem + 0.075rem));
    width: 2.125rem;
    height: 2.125rem;
    z-index: 15;
  }
  @container media-root (width > 40rem) {
    .media-rate-wrapper {
      bottom: calc(0.75rem + 0.25rem);
      right: calc(0.75rem + 0.25rem + 3 * (2.125rem + 0.125rem));
    }
  }

  /* Wrapper visibility — matches native controls animation (scale + blur + opacity) */
  .media-quality-wrapper,
  .media-rate-wrapper {
    opacity: 1;
    scale: 1;
    filter: blur(0);
    transform-origin: bottom;
    pointer-events: auto;
    will-change: scale, transform, filter, opacity;
    transition-timing-function: ease-out;
  }
  @media (pointer: fine) {
    .media-quality-wrapper,
    .media-rate-wrapper {
      transition-property: scale, transform, filter, opacity;
      transition-duration: 100ms;
      transition-delay: 0ms;
    }
    .media-default-skin:not([data-controls-visible]) .media-quality-wrapper:not([data-open]),
    .media-default-skin:not([data-controls-visible]) .media-rate-wrapper:not([data-open]) {
      opacity: 0;
      scale: 0.9;
      filter: blur(8px);
      pointer-events: none;
      transition-duration: 300ms;
      transition-delay: 500ms;
    }
  }

  /* Popup panel — centered over button */
  .media-rate-popup {
    position: absolute;
    bottom: calc(100% + 0.625rem);
    left: 50%;
    transform: translateX(-50%);
    width: 264px;
    border-radius: 0.875rem;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    z-index: 20;
    box-shadow: 0 8px 32px oklch(0 0 0 / 0.55);
  }

  /* Slider row */
  .media-rate-slider-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .media-rate-edge {
    font-size: 0.6875rem;
    color: oklch(1 0 0 / 0.4);
    min-width: 1.375rem;
    text-align: center;
    white-space: nowrap;
    font-family: inherit;
    flex-shrink: 0;
  }

  /* Range input */
  .media-rate-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    padding: 0;
    margin: 0;
  }
  .media-rate-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: oklch(1 0 0);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 0 2px oklch(0 0 0 / 0.25), 0 2px 4px oklch(0 0 0 / 0.3);
    transition: transform 0.12s;
  }
  .media-rate-slider:hover::-webkit-slider-thumb {
    transform: scale(1.25);
  }
  .media-rate-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: oklch(1 0 0);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 0 2px oklch(0 0 0 / 0.25);
  }
  .media-rate-slider::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: transparent;
  }

  /* Divider */
  .media-rate-divider {
    height: 1px;
    background: oklch(1 0 0 / 0.1);
    margin: 0 -0.125rem;
  }

  /* Presets row */
  .media-rate-presets {
    display: flex;
    gap: 0.3rem;
  }
  .media-rate-preset {
    flex: 1;
    padding: 0.325rem 0;
    background: oklch(1 0 0 / 0.07);
    border: 1px solid transparent;
    border-radius: 0.4375rem;
    color: oklch(1 0 0 / 0.6);
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
    text-align: center;
  }
  .media-rate-preset:hover {
    background: oklch(1 0 0 / 0.13);
    color: oklch(1 0 0);
  }
  .media-rate-preset.is-active {
    background: oklch(0.55 0.19 276 / 0.35);
    border-color: oklch(0.65 0.18 276 / 0.7);
    color: oklch(0.88 0.12 276);
  }

  /* Gesture overlay (tap-to-seek / play-pause indicator) */
  .media-gesture-indicator {
    position: absolute;
    top: 50%;
    pointer-events: none;
    color: oklch(1 0 0);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    z-index: 8;
    animation: gesture-pulse 650ms ease-out forwards;
    will-change: opacity, scale;
  }
  .media-gesture-indicator--center  { left: 50%;  transform: translate(-50%, -50%); }
  .media-gesture-indicator--back    { left: 18%;  transform: translate(-50%, -50%); }
  .media-gesture-indicator--forward { right: 18%; transform: translate(50%, -50%); }

  .media-gesture-circle {
    background: oklch(0 0 0 / 0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .media-gesture-circle svg {
    width: 2rem;
    height: 2rem;
  }
  .media-gesture-label {
    background: oklch(0 0 0 / 0.55);
    padding: 0.15rem 0.55rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0;
  }
  @keyframes gesture-pulse {
    0%   { opacity: 0; scale: 0.7; }
    20%  { opacity: 1; scale: 1; }
    100% { opacity: 0; scale: 1.15; }
  }

  .media-subtitles-overlay {
    position: absolute;
    left: 50%;
    bottom: 4.5rem;
    transform: translateX(-50%);
    max-width: 80%;
    padding: 0.4rem 0.85rem;
    background: oklch(0 0 0 / 0.65);
    color: oklch(1 0 0);
    font-size: 1.1rem;
    font-weight: 500;
    text-align: center;
    border-radius: 0.4rem;
    pointer-events: none;
    z-index: 9;
    text-shadow: 0 1px 2px oklch(0 0 0 / 0.7);
    white-space: pre-wrap;
  }
  .media-button--subtitles.is-active { color: oklch(0.75 0.15 276); }
`;


function fmtRate(r) {
  return r.toFixed(2).replace(/\.?0+$/, '') + '×';
}

function parseSrt(text) {
  const blocks = text.replace(/\r/g, '').trim().split(/\n\n+/);
  const toSec = (t) => {
    const [h, m, rest] = t.split(':');
    const [s, ms] = rest.split(',');
    return +h * 3600 + +m * 60 + +s + +ms / 1000;
  };
  return blocks.map(b => {
    const lines = b.split('\n');
    const time = lines[1]?.match(/(\S+)\s*-->\s*(\S+)/);
    if (!time) return null;
    return {
      start: toSec(time[1]),
      end: toSec(time[2]),
      text: lines.slice(2).join('\n').trim(),
    };
  }).filter(Boolean)
}

function getQualityLabel(level) {
  const h = level?.height;
  if (!h) return '?';
  if (h >= 1440) return '1440p';
  if (h >= 1080) return '1080p';
  if (h >= 720)  return '720p';
  if (h >= 480)  return '480p';
  return `${h}p`;
}

function QualitySelector() {
  const media    = useMedia();
  const [levels, setLevels]             = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [open, setOpen]                 = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!media) return;
    const hls = media.engine;
    if (!hls) return;
    const onParsed = () => setLevels([...hls.levels]);
    hls.on(Hls.Events.MANIFEST_PARSED, onParsed);
    if (hls.levels?.length) onParsed();
    return () => hls.off(Hls.Events.MANIFEST_PARSED, onParsed);
  }, [media]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectQuality = useCallback((idx) => {
    const hls = media?.engine;
    if (!hls) return;
    hls.currentLevel = idx;
    setCurrentLevel(idx);
    setOpen(false);
  }, [media]);

  if (levels.length < 2) return null;

  const buttonLabel = currentLevel === -1 ? 'Авто' : getQualityLabel(levels[currentLevel]);
  const sortedLevels = [...levels]
    .map((l, i) => ({ ...l, idx: i }))
    .sort((a, b) => (b.height || 0) - (a.height || 0));
  const menuItems = [{ label: 'Авто', idx: -1 }, ...sortedLevels.map(l => ({ label: getQualityLabel(l), idx: l.idx }))];

  return (
    <div
      ref={wrapperRef}
      className="media-quality-wrapper"
      data-open={open || undefined}
    >
      {open && (
        <div
          className="media-surface"
          style={{ position: 'absolute', bottom: 'calc(100% + 0.5rem)', right: 0, minWidth: '5.5rem', borderRadius: '0.75rem', overflow: 'hidden', padding: '0.25rem 0', zIndex: 20 }}
        >
          {menuItems.map(({ label: itemLabel, idx }) => (
            <button
              key={idx}
              type="button"
              className="media-quality-item"
              onClick={() => selectQuality(idx)}
              style={{ display: 'block', width: '100%', padding: '0.4rem 0.875rem', background: 'transparent', border: 'none', color: 'oklch(1 0 0)', textAlign: 'left', fontSize: '0.8125rem', fontWeight: currentLevel === idx ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 'normal', whiteSpace: 'nowrap' }}
            >
              {itemLabel}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="media-button media-button--icon media-button--quality"
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', height: '100%', aspectRatio: 'unset', padding: 0, fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0, color: 'oklch(1 0 0)', textShadow: '0 0 1px oklch(0 0 0 / 0.25)', placeItems: 'center' }}
        aria-label="Выбор качества видео"
        aria-expanded={open}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

const RATE_PRESETS = [0.5, 1, 1.25, 1.5, 2, 3];
const RATE_MIN = 0.2;
const RATE_MAX = 3;

function PlaybackRateSelector() {
  const media    = useMedia();
  const [rate, setRate] = useState(1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync with actual video element rate
  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const sync = () => setRate(video.playbackRate || 1);
    video.addEventListener('ratechange', sync);
    sync();
    return () => video.removeEventListener('ratechange', sync);
  }, [media]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const applyRate = useCallback((val) => {
    const r = Math.round(val * 100) / 100;
    if (media?.engine?.media) media.engine.media.playbackRate = r;
  }, [media]);

  const fillPct = ((rate - RATE_MIN) / (RATE_MAX - RATE_MIN) * 100).toFixed(2);
  const sliderBg = `linear-gradient(to right, oklch(0.65 0.18 276) ${fillPct}%, oklch(1 0 0 / 0.18) ${fillPct}%)`;

  return (
    <div
      ref={wrapperRef}
      className="media-rate-wrapper"
      data-open={open || undefined}
    >
      {open && (
        <div className="media-surface media-rate-popup">

          <div className="media-rate-slider-row">
            <span className="media-rate-edge">0.2×</span>
            <input
              type="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={0.05}
              value={rate}
              onChange={e => applyRate(parseFloat(e.target.value))}
              className="media-rate-slider"
              style={{ background: sliderBg }}
            />
            <span className="media-rate-edge">3×</span>
          </div>

          <div className="media-rate-divider" />

          {/* Row 2: Presets */}
          <div className="media-rate-presets">
            {RATE_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                className={`media-rate-preset${Math.abs(rate - p) < 0.01 ? ' is-active' : ''}`}
                onClick={() => applyRate(p)}
              >
                {fmtRate(p)}
              </button>
            ))}
          </div>

        </div>
      )}

      <button
        type="button"
        className="media-button media-button--icon media-button--rate"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', height: '100%', aspectRatio: 'unset', padding: 0,
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: 0,
          color: 'oklch(1 0 0)', textShadow: '0 0 1px oklch(0 0 0 / 0.25)',
          placeItems: 'center',
        }}
        aria-label="Скорость воспроизведения"
        aria-expanded={open}
      >
        {fmtRate(rate)}
      </button>
    </div>
  );
}

function ControlsSync() {
  const media = useMedia();

  useEffect(() => {
    if (!media?.engine?.media) return;
    const videoEl = media.engine.media;
    const root = videoEl.closest?.('.media-default-skin');
    if (!root) return;

    // .media-controls may not exist yet on first tick — wait for it
    let obs;
    function attach() {
      const ctrl = root.querySelector('.media-controls');
      if (!ctrl) return false;

      function sync() {
        root.toggleAttribute('data-controls-visible', ctrl.hasAttribute('data-visible'));
      }

      sync();
      obs = new MutationObserver(sync);
      obs.observe(ctrl, { attributes: true, attributeFilter: ['data-visible'] });
      return true;
    }

    if (!attach()) {
      // controls bar not in DOM yet — watch root for child additions
      const rootObs = new MutationObserver(() => { if (attach()) rootObs.disconnect(); });
      rootObs.observe(root, { childList: true });
      return () => { rootObs.disconnect(); obs?.disconnect(); };
    }

    return () => obs?.disconnect();
  }, [media]);

  return null;
}

const VOLUME_KEY = 'player_volume';
const MUTED_KEY  = 'player_muted';

function VolumeRestorer() {
  const media = useMedia();

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;

    const savedVolume = localStorage.getItem(VOLUME_KEY);
    const savedMuted  = localStorage.getItem(MUTED_KEY);
    if (savedVolume !== null) video.volume = parseFloat(savedVolume);
    if (savedMuted  !== null) video.muted  = savedMuted === 'true';

    const handleVolumeChange = () => {
      localStorage.setItem(VOLUME_KEY, String(video.volume));
      localStorage.setItem(MUTED_KEY,  String(video.muted));
    };

    video.addEventListener('volumechange', handleVolumeChange);
    return () => video.removeEventListener('volumechange', handleVolumeChange);
  }, [media]);

  return null;
}

function FirstFrameShower() {
  const media = useMedia();

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const hls   = media.engine;

    let done = false;

    function showFrame() {
      if (done || video.played.length > 0) return;
      done = true;
      video.currentTime = 0.001;
      const onSeeked = () => {
        video.currentTime = 0;
        video.removeEventListener('seeked', onSeeked);
      };
      video.addEventListener('seeked', onSeeked);
    }

    video.addEventListener('loadeddata', showFrame, { once: true });

    if (hls?.levels?.length && video.readyState >= 2) showFrame();

    return () => video.removeEventListener('loadeddata', showFrame);
  }, [media]);

  return null;
}

const SEEK_STEP = 10;
const MULTI_CLICK_WINDOW = 300;

const GESTURE_ICONS = {
  play:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  back:    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>,
  forward: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm8.5 0L23 12 14.5 6v12z"/></svg>,
};

function GestureOverlay() {
  const media = useMedia();
  const [indicator, setIndicator] = useState(null);
  const keyRef = useRef(0);

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const root  = video.closest?.('.media-default-skin');
    if (!root) return;

    let toggleTimer    = null;
    let seekResetTimer = null;
    let inSeekMode     = false;
    let seekAccum      = 0;
    let seekDirection  = 0;

    const seek = (delta) => {
      const d = video.duration || 0;
      const next = (video.currentTime || 0) + delta;
      video.currentTime = Math.max(0, d ? Math.min(d, next) : next);
    };

    const show = (type, amount) => {
      keyRef.current += 1;
      setIndicator({ type, amount, key: keyRef.current });
    };

    const resetSeekMode = () => {
      inSeekMode = false;
      seekAccum = 0;
      seekDirection = 0;
    };

    const doSeekClick = (dir, isLeft) => {
      if (dir !== seekDirection) {
        seekAccum = 0;
        seekDirection = dir;
      }
      seekAccum += SEEK_STEP;
      seek(dir * SEEK_STEP);
      show(isLeft ? 'back' : 'forward', seekAccum);
      clearTimeout(seekResetTimer);
      seekResetTimer = setTimeout(resetSeekMode, MULTI_CLICK_WINDOW);
    };

    const handleClick = (e) => {
      const t = e.target;
      if (
        t.closest('.media-controls') ||
        t.closest('.media-quality-wrapper') ||
        t.closest('.media-rate-wrapper') ||
        t.tagName === 'BUTTON' ||
        t.tagName === 'INPUT'
      ) return;

      const rect = root.getBoundingClientRect();
      const isLeft = (e.clientX - rect.left) < rect.width / 2;
      const dir = isLeft ? -1 : 1;

      if (inSeekMode) {
        doSeekClick(dir, isLeft);
        return;
      }

      if (toggleTimer) {
        clearTimeout(toggleTimer);
        toggleTimer = null;
        inSeekMode = true;
        doSeekClick(dir, isLeft);
        return;
      }

      toggleTimer = setTimeout(() => {
        toggleTimer = null;
        if (video.paused) {
          video.play();
          show('play');
        } else {
          video.pause();
          show('pause');
        }
      }, MULTI_CLICK_WINDOW);
    };

    root.addEventListener('click', handleClick);
    return () => {
      root.removeEventListener('click', handleClick);
      clearTimeout(toggleTimer);
      clearTimeout(seekResetTimer);
    };
  }, [media]);

  if (!indicator) return null;

  const position = indicator.type === 'back' || indicator.type === 'forward'
    ? indicator.type
    : 'center';

  return (
    <div
      key={indicator.key}
      className={`media-gesture-indicator media-gesture-indicator--${position}`}
      aria-hidden="true"
    >
      <div className="media-gesture-circle">{GESTURE_ICONS[indicator.type]}</div>
      {indicator.amount != null && (
        <div className="media-gesture-label">{indicator.amount} сек</div>
      )}
    </div>
  );
}

const VOLUME_ICONS = {
  off:  <svg className="media-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>,
  low:  <svg className="media-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M7 9v6h4l5 5V4l-5 5H7zm9.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.72 2.5-2.24 2.5-4.02z"/></svg>,
  high: <svg className="media-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>,
};

function InlineVolumeControl() {
  const media = useMedia();
  const [volume, setVolume] = useState(1);
  const [muted, setMuted]   = useState(false);

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const sync = () => { setVolume(video.volume); setMuted(video.muted); };
    video.addEventListener('volumechange', sync);
    sync();
    return () => video.removeEventListener('volumechange', sync);
  }, [media]);

  const video = media?.engine?.media;

  const apply = (v) => {
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, v));
    if (v > 0 && video.muted) video.muted = false;
  };

  const toggleMute = () => {
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
  };

  const effective = muted ? 0 : volume;
  const iconKey = effective === 0 ? 'off' : effective < 0.5 ? 'low' : 'high';
  const fillPct = (effective * 100).toFixed(0);
  const sliderBg = `linear-gradient(to right, oklch(1 0 0) ${fillPct}%, oklch(1 0 0 / 0.25) ${fillPct}%)`;

  return (
    <div className="media-volume-inline">
      <button
        type="button"
        className="media-button media-button--icon media-button--volume"
        onClick={toggleMute}
        aria-label={muted ? 'Включить звук' : 'Выключить звук'}
      >
        {VOLUME_ICONS[iconKey]}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={e => apply(parseFloat(e.target.value))}
        className="media-volume-slider"
        style={{ background: sliderBg }}
        aria-label="Громкость"
      />
    </div>
  );
}

function InlineSubtitlesButton({ enabled, onToggle, available }) {
  return (
    <button
      type="button"
      className={`media-button media-button--icon media-button--subtitles${enabled ? ' is-active' : ''}`}
      aria-label="Субтитры"
      title={available ? 'Субтитры' : 'Субтитры недоступны'}
      onClick={onToggle}
      disabled={!available}
      style={{ opacity: available ? 1 : 0.4 }}
    >
      <svg className="media-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/>
      </svg>
    </button>
  );
}

function SubtitlesOverlay({ cues, enabled }) {
  const media = useMedia();
  const [text, setText] = useState('');

  useEffect(() => {
    if (!enabled || !cues.length || !media?.engine?.media) {
      setText('');
      return;
    }
    const video = media.engine.media;
    const onTime = () => {
      const t = video.currentTime;
      const cue = cues.find(c => t >= c.start && t <= c.end);
      setText(cue ? cue.text : '');
    };
    video.addEventListener('timeupdate', onTime);
    onTime();
    return () => video.removeEventListener('timeupdate', onTime);
  }, [media, cues, enabled]);

  if (!enabled || !text) return null;
  return <div className="media-subtitles-overlay">{text}</div>;
}

function CustomControlsInjector({ subtitlesEnabled, onToggleSubtitles, subtitlesAvailable }) {
  const media = useMedia();
  const [slots, setSlots] = useState({ volume: null, subtitles: null });

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const root  = video.closest?.('.media-default-skin');
    if (!root) return;

    let volumeSlot    = null;
    let subtitlesSlot = null;
    let obs = null;

    const attach = () => {
      const controls     = root.querySelector('.media-controls');
      const timeEl       = controls?.querySelector('.media-time');
      const fullscreenEl = controls?.querySelector('.media-button--fullscreen');
      if (!controls || !timeEl || !fullscreenEl) return false;

      volumeSlot = document.createElement('div');
      volumeSlot.setAttribute('data-slot', 'volume');
      controls.insertBefore(volumeSlot, timeEl);

      subtitlesSlot = document.createElement('div');
      subtitlesSlot.setAttribute('data-slot', 'subtitles');
      controls.insertBefore(subtitlesSlot, fullscreenEl);

      setSlots({ volume: volumeSlot, subtitles: subtitlesSlot });
      return true;
    };

    if (!attach()) {
      obs = new MutationObserver(() => { if (attach()) obs.disconnect(); });
      obs.observe(root, { childList: true, subtree: true });
    }

    return () => {
      obs?.disconnect();
      volumeSlot?.remove();
      subtitlesSlot?.remove();
      setSlots({ volume: null, subtitles: null });
    };
  }, [media]);

  return (
    <>
      {slots.volume    && createPortal(<InlineVolumeControl />, slots.volume)}
      {slots.subtitles && createPortal(
        <InlineSubtitlesButton
          enabled={subtitlesEnabled}
          onToggle={onToggleSubtitles}
          available={subtitlesAvailable}
        />,
        slots.subtitles
      )}
    </>
  );
}

function ViewTracker({ onViewReached }) {
  const media = useMedia();
  const called      = useRef(false);
  const watchedSec  = useRef(0);
  const lastTime    = useRef(null);

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;

    const handler = () => {
      if (called.current || !video.duration) return;
      const current = video.currentTime;
      if (lastTime.current !== null && !video.paused) {
        const delta = current - lastTime.current;
        if (delta > 0 && delta <= 1.5) watchedSec.current += delta;
      }
      lastTime.current = current;
      if (watchedSec.current / video.duration >= 0.7) {
        called.current = true;
        onViewReached?.();
      }
    };

    const resetOnSeek = () => { lastTime.current = null; };

    video.addEventListener('timeupdate', handler);
    video.addEventListener('seeking', resetOnSeek);
    return () => {
      video.removeEventListener('timeupdate', handler);
      video.removeEventListener('seeking', resetOnSeek);
    };
  }, [media, onViewReached]);

  return null;
}



// Изолирует state субтитров от основного дерева плеера: при переключении
// ре-рендерится только этот компонент, а Player.Provider/HlsVideo остаются
// стабильными — иначе callback-ref в @videojs/react делает detach/attach
// видео-элемента, hls.js пересоздаёт MediaSource и blob URL меняется.
function SubtitlesController({ subtitlesUrl }) {
  const [cues, setCues] = useState([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!subtitlesUrl) { setCues([]); return; }
    let cancelled = false;
    fetch(subtitlesUrl)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => { if (!cancelled) setCues(parseSrt(t)); })
      .catch(() => { if (!cancelled) setCues([]); });
    return () => { cancelled = true; };
  }, [subtitlesUrl]);

  const toggle = useCallback(() => setEnabled(v => !v), []);

  return (
    <>
      <CustomControlsInjector
        subtitlesEnabled={enabled}
        onToggleSubtitles={toggle}
        subtitlesAvailable={cues.length > 0}
      />
      <SubtitlesOverlay cues={cues} enabled={enabled} />
    </>
  );
}

export const MyPlayer = ({ src, subtitlesUrl, onViewReached }) => (
  <>
    <style>{CUSTOM_CSS}</style>
    <Player.Provider>
      <VideoSkin>
        <>
          <HlsVideo src={src} playsInline />
          <QualitySelector />
          <PlaybackRateSelector />
          <ControlsSync />
          <VolumeRestorer />
          <FirstFrameShower />
          <GestureOverlay />
          <SubtitlesController subtitlesUrl={subtitlesUrl} />
          <ViewTracker onViewReached={onViewReached} />
        </>
      </VideoSkin>
    </Player.Provider>
  </>
);
