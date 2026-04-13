'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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
    .media-button.media-button--icon:not(.media-button--play):not(.media-button--seek):not(.media-button--mute):not(.media-button--captions):not(.media-button--fullscreen):not(.media-button--quality):not(.media-button--rate) {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  .media-button--playback-rate {
    visibility: hidden !important;
    pointer-events: none !important;
  }

  .media-quality-item:hover {
    background: oklch(1 0 0 / 0.15) !important;
  }

  /* Quality selector */
  .media-quality-wrapper {
    position: absolute;
    bottom: calc(0.75rem + 0.175rem);
    right: calc(0.75rem + 0.175rem + 2.125rem + 0.075rem);
    width: 2.125rem;
    height: 2.125rem;
    z-index: 15;
  }
  @container media-root (width > 40rem) {
    .media-quality-wrapper {
      bottom: calc(0.75rem + 0.25rem);
      right: calc(0.75rem + 0.25rem + 2.125rem + 0.125rem);
    }
  }

  /* Playback rate wrapper — skips quality (pos 1) and mute (pos 2), sits at pos 3 */
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
`;


function fmtRate(r) {
  return r.toFixed(2).replace(/\.?0+$/, '') + '×';
}

function getQualityLabel(level) {
  const h = level?.height;
  if (!h) return '?';
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

function ClickToToggle() {
  const media = useMedia();

  useEffect(() => {
    if (!media?.engine?.media) return;
    const video = media.engine.media;
    const root  = video.closest?.('.media-default-skin');
    if (!root) return;

    const handleClick = (e) => {
      const t = e.target;
      // Ignore clicks on any interactive control element
      if (
        t.closest('.media-controls') ||
        t.closest('.media-quality-wrapper') ||
        t.closest('.media-rate-wrapper') ||
        t.tagName === 'BUTTON' ||
        t.tagName === 'INPUT'
      ) return;

      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    };

    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  }, [media]);

  return null;
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

export const MyPlayer = ({ src, onViewReached }) => (
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
          <ClickToToggle />
          <ViewTracker onViewReached={onViewReached} />
        </>
      </VideoSkin>
    </Player.Provider>
  </>
);
