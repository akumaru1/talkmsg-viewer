import { useState, useEffect, useRef } from 'react';
import { memberColor, avatarChar, isAnnouncement } from '../utils/memberColors.js';
import { replaceName } from '../utils/textUtils.js';
import './Hub.css';

// ── Manually set which members are "online" ──────────────────────────────────
// Add or remove member names (in Japanese) to control their status.
const ONLINE_MEMBERS = new Set([
  '一ノ瀬美空',
  '井上和',
  '奥田いろは',
  '田村真佑',
]);
// ─────────────────────────────────────────────────────────────────────────────

export default function Hub({ members, loading, onSelectMember }) {
  // Split into regular members and announcement channels
  const regular  = members.filter(m => !isAnnouncement(m));
  const announce = members.filter(m => isAnnouncement(m));

  const online  = regular.filter(m => ONLINE_MEMBERS.has(m.name));
  const offline = regular.filter(m => !ONLINE_MEMBERS.has(m.name));

  // ── Settings dropdown + sync state ─────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    generate_data: { running: false, lastStatus: null },
  });
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Fetch real status on mount so indicator resumes after navigating away
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/sync/status');
        const data = await res.json();
        setSyncStatus(data);
      } catch {}
    })();
  }, []);

  // Poll sync status while something is running
  useEffect(() => {
    const anyRunning = Object.values(syncStatus).some(s => s.running);
    if (!anyRunning) return;
    const id = setInterval(async () => {
      try {
        const res  = await fetch('/api/sync/status');
        const data = await res.json();
        setSyncStatus(data);
      } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [syncStatus]);

  const triggerSync = async (script) => {
    try {
      await fetch('/api/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ script }),
      });
      setSyncStatus(prev => ({
        ...prev,
        [script]: { running: true, lastStatus: null },
      }));
      if (script === 'generate_data') {
        // Poll until the sync is done, then show alert
        const poll = async () => {
          try {
            while (true) {
              const res = await fetch('/api/sync/status');
              const data = await res.json();
              if (!data.generate_data.running) break;
              await new Promise(r => setTimeout(r, 1000));
            }
            alert('Sync complete! Please refresh the page.');
          } catch {}
        };
        poll();
      }
    } catch {}
    setMenuOpen(false);
  };

  const SyncIndicator = ({ scriptKey }) => {
    const s = syncStatus[scriptKey];
    if (s.running) return <span className="sync-dot running" title="Running…" />;
    return null;
  };

  return (
    <div className="hub">
      {/* ── Header ── */}
      <header className="hub-header">
        <span className="hub-header-title">Talk</span>
        <div className="hub-header-icon-wrap" ref={menuRef}>
          {Object.values(syncStatus).some(s => s.running) && (
            <span className="sync-dot running header-sync-dot" title="Sync running…" />
          )}
          <span
            className="hub-header-icon"
            onClick={() => setMenuOpen(o => !o)}
            title="Settings"
          >⚙️</span>
          {menuOpen && (
            <div className="settings-menu">
              <button
                className="settings-menu-item"
                onClick={() => triggerSync('generate_data')}
                disabled={syncStatus.generate_data.running}
              >
                Sync All
                <SyncIndicator scriptKey="generate_data" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="scroll-area hub-body">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : (
          <>
            {/* ── Online section ── */}
            {online.length > 0 && (
              <section className="hub-grid-section">
                <div className="hub-status-label online">Online</div>
                <div className="hub-grid">
                  {online.map(m => (
                    <MemberCard key={m.data_file} member={m} online onSelect={onSelectMember} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Divider ── */}
            {online.length > 0 && offline.length > 0 && (
              <hr className="hub-divider" />
            )}

            {/* ── Offline section ── */}
            {offline.length > 0 && (
              <section className="hub-grid-section">
                <div className="hub-status-label offline">Offline</div>
                <div className="hub-grid">
                  {offline.map(m => (
                    <MemberCard key={m.data_file} member={m} online={false} onSelect={onSelectMember} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Announcement rows (unchanged) ── */}
            {announce.length > 0 && (
              <section>
                <div className="hub-section-label">お知らせ</div>
                {announce.map(m => (
                  <MemberRow key={m.data_file} member={m} onSelect={onSelectMember} announce />
                ))}
              </section>
            )}

            {members.length === 0 && !loading && (
              <div className="hub-empty">メンバーが見つかりません</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Grid card (new) ──────────────────────────────────────────────────────────
function MemberCard({ member, online, onSelect }) {
  const color   = memberColor(member.name);
  const initial = avatarChar(member.name);
  const avatarUrl = member.avatar
    ? `/media/${encodeURIComponent(member.avatar).replace(/%2F/g, '/')}?v=${member.avatar_mtime ?? 0}`
    : null;

  return (
    <div
      className={`member-card ${online ? 'online' : 'offline'}`}
      onClick={() => onSelect(member)}
    >
      <div
        className="member-card-avatar"
        style={avatarUrl ? {} : { background: color }}
        aria-hidden="true"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={member.name} className="member-avatar-img" />
          : initial
        }
      </div>
      <div className="member-card-name">{member.name}</div>
    </div>
  );
}

// ── List row (announcement section) ──────────────────────────────────────────
function MemberRow({ member, onSelect, announce = false }) {
  const color   = announce ? '#607d8b' : memberColor(member.name);
  const initial = announce ? '📢' : avatarChar(member.name);
  const avatarUrl = (!announce && member.avatar)
    ? `/media/${encodeURIComponent(member.avatar).replace(/%2F/g, '/')}?v=${member.avatar_mtime ?? 0}`
    : null;
  const preview = member.last_message
    ? replaceName(member.last_message).replace(/\n/g, ' ')
    : '(メッセージなし)';

  return (
    <div className="member-row" onClick={() => onSelect(member)}>
      <div
        className="member-avatar"
        style={avatarUrl ? {} : { background: color }}
        aria-hidden="true"
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={member.name} className="member-avatar-img" />
          : initial
        }
      </div>
      <div className="member-info">
        <div className="member-name">{member.name}</div>
        <div className="member-preview">{preview}</div>
      </div>
      <div className="member-chevron">›</div>
    </div>
  );
}
