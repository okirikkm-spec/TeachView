'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import '@videojs/react/video/skin.css';
import { createPlayer, videoFeatures, useMedia, usePlayer, selectControls } from '@videojs/react';
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
    .media-button.media-button--icon:not(.media-button--play):not(.media-button--seek):not(.media-button--playback-rate):not(.media-button--mute):not(.media-button--captions):not(.media-button--fullscreen):not(.media-button--quality) {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  .media-quality-item:hover {
    background: oklch(1 0 0 / 0.15) !important;
  }
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
`;

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
  const controls = usePlayer(selectControls);
  const [levels, setLevels]             = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [open, setOpen]                 = useState(false);
  const wrapperRef = useRef(null);

  const isControlsVisible = (controls?.controlsVisible ?? true) || open;

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
      style={{
        opacity: isControlsVisible ? 1 : 0,
        pointerEvents: isControlsVisible ? 'auto' : 'none',
        transition: isControlsVisible ? 'opacity 100ms ease-out' : 'opacity 300ms ease-out 500ms',
      }}
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
        // delta в норме ~0.25с; если > 1.5с — это перемотка, не засчитываем
        if (delta > 0 && delta <= 1.5) {
          watchedSec.current += delta;
        }
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
          <ViewTracker onViewReached={onViewReached} />
        </>
      </VideoSkin>
    </Player.Provider>
  </>
);
