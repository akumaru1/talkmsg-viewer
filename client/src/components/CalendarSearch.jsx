import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatMonthYear } from '../utils/parseTime.js';
import './CalendarSearch.css';

// loadedMonths: Set of 'YYYYMM' strings already in the chat viewport
export default function CalendarSearch({ months, loadedMonths = new Set(), onJump, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Group months by year for display
  const byYear = months.reduce((acc, m) => {
    const year = m.slice(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => a - b);
  // Sort months within each year ascending (1月 → 12月)
  years.forEach(y => byYear[y].sort());

  return createPortal(
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal-sheet" onClick={e => e.stopPropagation()}>
        {/* Handle / drag indicator */}
        <div className="cal-handle" />

        <div className="cal-header">
          <h2 className="cal-title">📅 日付にジャンプ</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="cal-body">
          {months.length === 0 ? (
            <p className="cal-empty">データがありません</p>
          ) : (
            years.map(year => (
              <div key={year} className="cal-year-group">
                <div className="cal-year-label">{year}年</div>
                <div className="cal-months-grid">
                  {byYear[year].map(m => (
                    <button
                      key={m}
                      className={`cal-month-btn ${loadedMonths.has(m) ? 'loaded' : ''}`}
                      onClick={() => onJump(m)}
                    >
                      {formatMonthYear(m).replace(/^\d+年/, '')}
                      {!loadedMonths.has(m) && <span className="cal-month-unloaded" title="まだ読み込まれていません">↑</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
