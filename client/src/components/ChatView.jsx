import { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { memberColor, avatarChar, isAnnouncement } from '../utils/memberColors.js';
import { formatDate, isSameDay, getMonthKey } from '../utils/parseTime.js';
import MessageBubble from './MessageBubble.jsx';
import CalendarSearch from './CalendarSearch.jsx';
import './ChatView.css';

export default function ChatView({
  member, messages, loading,
  loadingOlder, loadingNewer, hasMore, hasNewer, totalMessages,
  onLoadOlder, onLoadNewer, onJumpToMonth, onBack, onGallery,
  chatFavorites = [], onToggleChatFavorite,
}) {
  const bottomRef         = useRef(null);
  const bottomSentinelRef = useRef(null);
  const scrollAreaRef     = useRef(null);
  const topSentinelRef    = useRef(null);
  const prevScrollHeightRef = useRef(0);
  // When set, scroll to this month anchor after the next load completes
  const jumpTargetRef  = useRef(null);

  const [calOpen,      setCalOpen]    = useState(false);
  const [favOpen,      setFavOpen]    = useState(false);
  const favOpenRef                    = useRef(false);
  // Months fetched from the dedicated API endpoint (covers ALL messages)
  const [allMonths,    setAllMonths]  = useState([]);

  // Set of favorited message IDs for O(1) lookup
  const favMessageIds = useMemo(() => new Set(chatFavorites.map(f => f.id)), [chatFavorites]);
  // Favorites sorted by timestamp ascending
  const sortedFavorites = useMemo(() =>
    [...chatFavorites].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '')),
    [chatFavorites]
  );

  // Favorites with date separators interleaved
  const groupedFavorites = useMemo(() => {
    const result = [];
    let lastDay = null;
    for (const msg of sortedFavorites) {
      const dayKey = (msg.timestamp || '').slice(0, 8);
      if (dayKey && dayKey !== lastDay) {
        result.push({ type: 'date-sep', key: `fav-ds-${dayKey}`, ts: msg.timestamp });
        lastDay = dayKey;
      }
      result.push({ type: 'message', key: msg.id, msg });
    }
    return result;
  }, [sortedFavorites]);

  const color     = isAnnouncement(member) ? '#607d8b' : memberColor(member.name);
  const initial   = isAnnouncement(member) ? '📢' : avatarChar(member.name);
  const avatarUrl = (!isAnnouncement(member) && member.avatar)
    ? `/media/${encodeURIComponent(member.avatar).replace(/%2F/g, '/')}?v=${member.avatar_mtime ?? 0}`
    : null;

  // ── Scroll positioning after load completes ──────────────────────────────────
  // useLayoutEffect fires synchronously after DOM mutation but BEFORE paint,
  // so the user never sees a flash at the wrong scroll position.
  useLayoutEffect(() => {
    if (!loading && messages.length > 0) {
      if (jumpTargetRef.current) {
        // We jumped to a month — the offset calc already placed the target
        // month at the start of the batch, so scrollTop = 0 shows it.
        jumpTargetRef.current = null;
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = 0;
        }
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      }
    }
  }, [loading]);

  // ── Preserve scroll position when older messages are prepended ────────────
  // Before new messages are added, record the scroll height.
  // After React re-renders, adjust scrollTop to keep the user's view stable.
  useEffect(() => {
    if (loadingOlder) {
      prevScrollHeightRef.current = scrollAreaRef.current?.scrollHeight ?? 0;
    }
  }, [loadingOlder]);

  useEffect(() => {
    if (!loadingOlder && prevScrollHeightRef.current > 0 && scrollAreaRef.current) {
      const diff = scrollAreaRef.current.scrollHeight - prevScrollHeightRef.current;
      scrollAreaRef.current.scrollTop += diff;
      prevScrollHeightRef.current = 0;
    }
  });

  // ── IntersectionObserver: trigger load when sentinel reaches the viewport ─
  useEffect(() => {
    if (!topSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadOlder(); },
      { root: scrollAreaRef.current, threshold: 0.1 }
    );
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadOlder]);
  // ── IntersectionObserver: load newer when bottom sentinel enters viewport ──
  useEffect(() => {
    if (!bottomSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadNewer(); },
      { root: scrollAreaRef.current, threshold: 0.1 }
    );
    observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadNewer]);
  // ── Fetch all available months for this member (for the calendar) ─────────
  useEffect(() => {
    if (!member) return;
    fetch(`/api/months/${encodeURIComponent(member.data_file)}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAllMonths(d) : setAllMonths([]))
      .catch(() => setAllMonths([]));
  }, [member]);

  // ── Keep ref in sync so the popstate handler always sees the latest value ─
  useEffect(() => { favOpenRef.current = favOpen; }, [favOpen]);

  // ── Push history entry when favorites panel opens so back closes it ───────
  useEffect(() => {
    if (favOpen) {
      history.pushState({ view: 'chat', favPanel: true }, '');
    }
  }, [favOpen]);

  // ── Intercept back button to close the favorites panel if it's open ───────
  useEffect(() => {
    const handlePop = () => {
      if (favOpenRef.current) {
        setFavOpen(false);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // ── Jump to a specific month ────────────────────────────────────────────────────
  const handleJump = (yyyymm) => {
    setCalOpen(false);

    const el = document.getElementById(`month-${yyyymm}`);
    if (el) {
      // Already in the DOM — scroll instantly
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Not loaded yet — request a batch from the server, then scroll to anchor
      jumpTargetRef.current = yyyymm;
      onJumpToMonth(yyyymm);
    }
  };

  // ── Build grouped message list with date/month separators ─────────────────
  const grouped = useMemo(() => {
    const result  = [];
    let lastDay   = null;
    let lastMonth = null;

    for (const msg of messages) {
      const ts       = msg.timestamp || '';
      const monthKey = ts.slice(0, 6);
      const dayKey   = ts.slice(0, 8);

      if (monthKey && monthKey !== lastMonth) {
        result.push({ type: 'month-anchor', key: `ma-${monthKey}`, month: monthKey });
        lastMonth = monthKey;
      }
      if (dayKey && dayKey !== lastDay) {
        result.push({ type: 'date-sep', key: `ds-${dayKey}`, ts });
        lastDay = dayKey;
      }
      result.push({ type: 'message', key: msg.id, msg });
    }
    return result;
  }, [messages]);

  const loaded = messages.length;

  return (
    <div className="chat-view">
      {/* ── Header ── */}
      <header className="app-header chat-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">←</button>
        <div className="chat-header-avatar" style={avatarUrl ? {} : { background: color }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={member.name} className="member-avatar-img" />
            : initial
          }
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">{member.name}</div>
          <div className="chat-header-group">{member.group}</div>
        </div>
        {totalMessages > 0 && (
          <div className="chat-count">{totalMessages} Messages</div>
        )}
        <button className="icon-btn pink" onClick={() => setCalOpen(true)} aria-label="Calendar">📅</button>
        <button className="icon-btn pink" onClick={onGallery} aria-label="Gallery">🖼️</button>
        <button
          className={`icon-btn pink${favOpen ? ' active-fav' : ''}`}
          onClick={() => setFavOpen(o => !o)}
          aria-label="Favorites"
          title={`Favorites (${chatFavorites.length})`}
        >
          {chatFavorites.length > 0 ? '★' : '☆'}
        </button>
      </header>

      {/* ── Messages ── */}
      <div className="scroll-area chat-scroll" ref={scrollAreaRef}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">メッセージがありません</div>
        ) : (
          <>
            {/* Top sentinel — triggers older-message loading via IntersectionObserver */}
            <div ref={topSentinelRef} className="top-sentinel" />

            {/* Older-messages loading indicator */}
            {loadingOlder && (
              <div className="older-loading">
                <div className="spinner" />
                <span>古いメッセージを読み込み中…</span>
              </div>
            )}

            {/* "No more" banner when everything is loaded */}
            {!hasMore && !loadingOlder && loaded > 0 && (
              <div className="no-more-messages">
                ─ メッセージの始まり ({totalMessages}件) ─
              </div>
            )}

            {grouped.map(item => {
              if (item.type === 'month-anchor') {
                return <div id={`month-${item.month}`} key={item.key} className="month-anchor" />;
              }
              if (item.type === 'date-sep') {
                return (
                  <div key={item.key} className="date-separator">
                    <span>{formatDate(item.ts)}</span>
                  </div>
                );
              }
              return (
                <MessageBubble
                  key={item.key}
                  message={item.msg}
                  memberColor={color}
                  memberInitial={initial}
                  avatarUrl={avatarUrl}
                  isFavorite={favMessageIds.has(item.msg.id)}
                  onToggleFavorite={onToggleChatFavorite}
                />
              );
            })}

            {/* Bottom sentinel — triggers newer-message loading */}
            <div ref={bottomSentinelRef} className="top-sentinel" />

            {/* Newer-messages loading indicator */}
            {loadingNewer && (
              <div className="older-loading">
                <div className="spinner" />
                <span>新しいメッセージを読み込み中…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Calendar Modal ── */}
      {calOpen && (
        <CalendarSearch
          months={allMonths}
          loadedMonths={new Set(messages.map(m => getMonthKey(m.timestamp)))}
          onJump={handleJump}
          onClose={() => setCalOpen(false)}
        />
      )}

      {/* ── Favorites Panel ── */}
      {favOpen && (
        <div className="fav-panel">
          <div className="fav-panel-header">
            <span className="fav-panel-title">★ Favorites ({chatFavorites.length})</span>
            <button className="icon-btn" onClick={() => setFavOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="fav-panel-body scroll-area">
            {sortedFavorites.length === 0 ? (
              <div className="chat-empty">お気に入りのメッセージはありません</div>
            ) : (
              groupedFavorites.map(item =>
                item.type === 'date-sep' ? (
                  <div key={item.key} className="date-separator">
                    <span>{formatDate(item.ts)}</span>
                  </div>
                ) : (
                  <MessageBubble
                    key={item.key}
                    message={item.msg}
                    memberColor={color}
                    memberInitial={initial}
                    avatarUrl={avatarUrl}
                    isFavorite
                    onToggleFavorite={onToggleChatFavorite}
                  />
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
