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

  return (
    <div className="hub">
      {/* ── Header ── */}
      <header className="hub-header">
        <span className="hub-header-title">Talk</span>
        <span className="hub-header-icon">⚙️</span>
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
    <button
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
    </button>
  );
}

// ── List row (announcement section – unchanged) ──────────────────────────────
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
    <button className="member-row" onClick={() => onSelect(member)}>
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
    </button>
  );
}
