import { useState } from 'react';
import { formatTime } from '../utils/parseTime.js';
import { replaceName } from '../utils/textUtils.js';
import Lightbox from './Lightbox.jsx';
import './MessageBubble.css';

export default function MessageBubble({ message, memberColor, memberInitial, avatarUrl, isFavorite, onToggleFavorite }) {
  const { text, image, media, type, timestamp } = message;
  const [lightbox, setLightbox] = useState(false);

  const cleanText = text ? replaceName(text) : '';
  const timeStr   = formatTime(timestamp);

  const mediaUrl  = media  ? `/media/${media}`  : null;
  const imageUrl  = image  ? `/media/${image}`  : null;

  return (
    <div className="bubble-row">
      {/* Member avatar */}
      <div className="bubble-avatar" style={avatarUrl ? {} : { background: memberColor }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="member-avatar-img" />
          : memberInitial
        }
      </div>

      <div className="bubble-content">
        {/* ── Image ── */}
        {type === 'image' && imageUrl && (
          <div className="bubble bubble-media" onClick={() => setLightbox(true)}>
            <div className="bubble-media-wrapper">
              <img
                className="bubble-img"
                src={imageUrl}
                alt=""
                loading="lazy"
                onError={e => { e.target.parentElement.style.display = 'none'; }}
              />
            </div>
            {cleanText && <p className="bubble-caption">{cleanText}</p>}
          </div>
        )}

        {/* ── Video ── */}
        {type === 'video' && mediaUrl && (
          <div className="bubble bubble-media bubble-media-video">
            <video
              className="bubble-video"
              src={mediaUrl}
              controls
              preload="metadata"
              playsInline
            />
            {cleanText && <p className="bubble-caption">{cleanText}</p>}
          </div>
        )}

        {/* ── Voice ── */}
        {type === 'voice' && mediaUrl && (
          <div className="bubble bubble-voice">
            <span className="voice-icon">🎙️</span>
            <audio src={mediaUrl} controls className="voice-audio" preload="none" />
            {cleanText && <p className="bubble-caption">{cleanText}</p>}
          </div>
        )}

        {/* ── Text only (or fallback for types with no media file) ── */}
        {(type === 'text' || (!imageUrl && !mediaUrl)) && cleanText && (
          <div className="bubble bubble-text">
            <p className="bubble-text-content">{cleanText}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="bubble-time">{timeStr}</div>
      </div>

      {/* Favorite star */}
      {onToggleFavorite && (
        <button
          className={`msg-fav-btn${isFavorite ? ' active' : ''}`}
          onClick={() => onToggleFavorite(message)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}

      {/* Lightbox for image preview */}
      {lightbox && imageUrl && (
        <Lightbox src={imageUrl} caption={cleanText} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
