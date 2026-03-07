import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Lightbox.css';

export default function Lightbox({ src, type = 'image', caption, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>

        {type === 'image' && (
          <img className="lightbox-img" src={src} alt="" />
        )}

        {type === 'video' && (
          <video
            className="lightbox-video"
            src={src}
            controls
            autoPlay
            playsInline
          />
        )}

        {type === 'voice' && (
          <div className="lightbox-audio-wrap">
            <div className="lightbox-audio-icon">🎙️</div>
            <audio className="lightbox-audio" src={src} controls autoPlay />
          </div>
        )}

        {caption && <p className="lightbox-caption">{caption}</p>}
      </div>
    </div>,
    document.body
  );
}
