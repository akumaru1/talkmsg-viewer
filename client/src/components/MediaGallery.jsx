import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { formatMonthYear, getMonthKey, formatDate, formatTime, formatDateYYYYMMDD } from '../utils/parseTime.js';
import { memberColor, avatarChar, isAnnouncement } from '../utils/memberColors.js';
import { replaceName } from '../utils/textUtils.js';
import Lightbox from './Lightbox.jsx';
import CalendarSearch from './CalendarSearch.jsx';
import './MediaGallery.css';

export default function MediaGallery({ member, messages, loading, loadingOlder, loadingNewer, hasMore, hasNewer, totalMessages, onLoadOlder, onLoadNewer, onJumpToMonth, onBack }) {
  const [filter,   setFilter]   = useState('all'); // 'all' | 'image' | 'video' | 'voice'
  const [month,    setMonth]    = useState('all'); // 'all' | 'YYYYMM'
  const [lightbox, setLightbox] = useState(null);  // { src, caption }
  const [calOpen,  setCalOpen]  = useState(false);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [allMonths, setAllMonths] = useState([]);
  const jumpTargetRef = useRef(null);

  const color     = isAnnouncement(member) ? '#607d8b' : memberColor(member.name);
  const initial   = isAnnouncement(member) ? '📢' : avatarChar(member.name);
  const avatarUrl = (!isAnnouncement(member) && member.avatar)
    ? `/media/${encodeURIComponent(member.avatar).replace(/%2F/g, '/')}?v=${member.avatar_mtime ?? 0}`
    : null;

  // All media messages (image / video / voice)
  const mediaMessages = useMemo(
    () => messages.filter(m => m.type !== 'text'),
    [messages]
  );

  // Filtered list
  const filtered = useMemo(() => {
    return mediaMessages.filter(m => {
      const typeOk  = filter === 'all' || m.type === filter;
      const monthOk = month  === 'all' || getMonthKey(m.timestamp) === month;
      return typeOk && monthOk;
    });
  }, [mediaMessages, filter, month]);

  // Group filtered items by month (ascending — oldest top, newest bottom)
  const groups = useMemo(() => {
    const map = new Map();
    for (const msg of filtered) {
      const key = getMonthKey(msg.timestamp) || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(msg);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))          // oldest month first
      .map(([key, items]) => ({
        key,
        label: formatMonthYear(key),
        items: [...items].sort((a, b) =>                   // oldest item first
          (a.timestamp || '').localeCompare(b.timestamp || '')
        ),
      }));
  }, [filtered]);

  const scrollAreaRef      = useRef(null);
  const bottomRef          = useRef(null);
  const bottomSentinelRef  = useRef(null);
  const topSentinelRef     = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // ── Fetch all available months for this member (for the calendar) ─────────
  useEffect(() => {
    if (!member) return;
    fetch(`/api/months/${encodeURIComponent(member.data_file)}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAllMonths(d) : setAllMonths([]))
      .catch(() => setAllMonths([]));
  }, [member]);

  // ── Scroll to bottom on initial load, OR to month section after a calendar jump ─
  useLayoutEffect(() => {
    if (!loading) {
      if (jumpTargetRef.current) {
        const target = jumpTargetRef.current;
        jumpTargetRef.current = null;
        // Try to scroll to the month section anchor; fall back to top
        requestAnimationFrame(() => {
          const el = document.getElementById(`gallery-month-${target}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = 0;
          }
        });
      } else if (groups.length > 0) {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      }
    }
  }, [loading]);

  // ── Calendar jump handler ──────────────────────────────────────────────────
  const handleCalJump = (yyyymm) => {
    setCalOpen(false);
    const loadedMediaMonths = new Set(groups.map(g => g.key));
    if (loadedMediaMonths.has(yyyymm)) {
      // Already in DOM — scroll directly to its section (keep filter as-is)
      const el = document.getElementById(`gallery-month-${yyyymm}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Not loaded yet — request the right batch from server, then scroll to section
      jumpTargetRef.current = yyyymm;
      onJumpToMonth(yyyymm);
    }
  };

  // ── IntersectionObserver: auto-load older when sentinel reaches viewport ──
  useEffect(() => {
    if (!topSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadOlder(); },
      { root: scrollAreaRef.current, threshold: 0.1 }
    );
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadOlder]);

  // ── IntersectionObserver: auto-load newer when bottom sentinel enters viewport ─
  useEffect(() => {
    if (!bottomSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadNewer(); },
      { root: scrollAreaRef.current, threshold: 0.1 }
    );
    observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadNewer]);

  // Before loading older: snapshot scroll height
  useEffect(() => {
    if (loadingOlder) {
      prevScrollHeightRef.current = scrollAreaRef.current?.scrollHeight ?? 0;
    }
  }, [loadingOlder]);

  // After loading older: restore scroll position
  useEffect(() => {
    if (!loadingOlder && prevScrollHeightRef.current > 0 && scrollAreaRef.current) {
      const diff = scrollAreaRef.current.scrollHeight - prevScrollHeightRef.current;
      scrollAreaRef.current.scrollTop += diff;
      prevScrollHeightRef.current = 0;
    }
  });

  // If the filtered content doesn't fill the scroll area, keep loading older batches
  // until there's enough to scroll (fixes video/voice mode where few items exist per batch)
  useEffect(() => {
    if (loading || loadingOlder || !hasMore) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      onLoadOlder();
    }
  }, [loading, loadingOlder, hasMore, filtered, onLoadOlder]);

  return (
    <div className="gallery">
      {/* ── Header ── */}
      <header className="app-header gallery-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back to chat">←</button>
        <div className="gallery-avatar" style={avatarUrl ? {} : { background: color }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={member.name} className="member-avatar-img" />
            : initial
          }
        </div>
        <div className="gallery-title">
          <div className="gallery-name">メディア</div>
        </div>
      </header>

      {/* ── Filter Bar ── */}
      <div className="gallery-filters">
        {/* Type filter */}
        <div className="filter-chips">
          {[['all','すべて'],['image','📷'],['video','🎬'],['voice','🎙️']].map(([val, label]) => (
            <button
              key={val}
              className={`filter-chip ${filter === val ? 'active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Month jump */}
        <button
          className="filter-chip cal-chip"
          onClick={() => {
            const sections = [...(scrollAreaRef.current?.querySelectorAll('.gallery-month-section[id^="gallery-month-"]') ?? [])];
            if (sections.length > 0) {
              const top = scrollAreaRef.current.getBoundingClientRect().top;
              let cur = sections[0].id.replace('gallery-month-', '');
              for (const el of sections) {
                if (el.getBoundingClientRect().top <= top + 10) cur = el.id.replace('gallery-month-', '');
              }
              setCurrentMonth(cur);
            }
            setCalOpen(true);
          }}
          aria-label="Calendar"
        >
          📅
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="scroll-area gallery-scroll" ref={scrollAreaRef}>
        {/* Top sentinel — triggers older-message loading via IntersectionObserver */}
        <div ref={topSentinelRef} className="top-sentinel" />

        {/* Older-media loading indicator */}
        {loadingOlder && (
          <div className="older-loading">
            <div className="spinner" />
            <span>古いメディアを読み込み中…</span>
          </div>
        )}

        {/* "No more" banner when everything is loaded */}
        {!hasMore && !loadingOlder && messages.length > 0 && (
          <div className="no-more-messages">
            ─ メディアの始まり ({totalMessages}件) ─
          </div>
        )}

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="gallery-empty">メディアがありません</div>
        ) : (
          groups.map(({ key, label, items }) => (
            <div key={key} id={`gallery-month-${key}`} className="gallery-month-section">
              <div className="gallery-month-header">{label}</div>
              <div className="gallery-grid">
                {items.map(msg => (
                  <GalleryTile
                    key={msg.id}
                    msg={msg}
                    onOpen={() => {
                      if (msg.type === 'image') {
                        setLightbox({ src: `/media/${msg.image}`, type: 'image', caption: replaceName(msg.text || '') });
                      } else if (msg.type === 'video' && msg.media) {
                        setLightbox({ src: `/media/${msg.media}`, type: 'video', caption: replaceName(msg.text || '') });
                      } else if (msg.type === 'voice' && msg.media) {
                        setLightbox({ src: `/media/${msg.media}`, type: 'voice', caption: replaceName(msg.text || '') });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Bottom sentinel — triggers newer-media loading */}
        <div ref={bottomSentinelRef} className="top-sentinel" />

        {/* Newer-media loading indicator */}
        {loadingNewer && (
          <div className="older-loading">
            <div className="spinner" />
            <span>新しいメディアを読み込み中…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          type={lightbox.type}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Calendar */}
      {calOpen && (
        <CalendarSearch
          months={allMonths}
          currentMonth={currentMonth}
          onJump={handleCalJump}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}

// Captures the first video frame into a canvas thumbnail
function VideoThumb({ src, fallback }) {
  const [thumb, setThumb] = useState(fallback || null);
  const didCapture = useRef(false);

  useEffect(() => {
    if (!src || didCapture.current) return;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const capture = () => {
      if (didCapture.current) return;
      didCapture.current = true;
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 180;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      if (dataUrl && dataUrl !== 'data:,') setThumb(dataUrl);
    };

    video.addEventListener('seeked', capture);
    video.addEventListener('loadeddata', () => { video.currentTime = 0.1; });
    video.src = src;
    video.load();

    return () => {
      video.removeEventListener('seeked', capture);
      video.removeEventListener('loadeddata', () => {});
      video.src = '';
    };
  }, [src]);

  if (thumb) {
    return <img className="tile-thumb" src={thumb} alt="" />;
  }
  return <div className="tile-thumb tile-placeholder">🎬</div>;
}

function GalleryTile({ msg, onOpen }) {
  const { type, image, media, timestamp, text } = msg;
  const imageUrl = image ? `/media/${image}` : null;
  const mediaUrl = media ? `/media/${media}` : null;
  const caption  = replaceName(text || '');

  return (
    <div className="gallery-tile" onClick={onOpen}>
      {type === 'image' && imageUrl && (
        <>
          <img
            className="tile-thumb"
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={e => { e.target.parentElement.classList.add('tile-error'); }}
          />
          <div className="tile-overlay">
            <span className="tile-icon">🔍</span>
          </div>
        </>
      )}

      {type === 'video' && (
        <>
          <VideoThumb src={mediaUrl} fallback={imageUrl} />
          <div className="tile-overlay">
            <span className="tile-icon">▶</span>
          </div>
          <div className="tile-video-badge">▶ VIDEO</div>
        </>
      )}

      {type === 'voice' && (
        <div className="tile-voice-tile">
          <span className="voice-tile-icon">🎙️</span>
          <div className="voice-tile-time">{formatDateYYYYMMDD(timestamp)}</div>
          {caption && <div className="voice-tile-caption">{caption.slice(0, 30)}</div>}
        </div>
      )}

      <div className="tile-timestamp">{formatDateYYYYMMDD(timestamp)}</div>
    </div>
  );
}
