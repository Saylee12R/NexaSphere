import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Lightbox — full-screen photo viewer with swipe, comments, tagging, share
 */
export default function Lightbox({ photos, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [fullscreen, setFullscreen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const slideshowRef = useRef(null);
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  const photo = photos[index];

  // ── Navigation ────────────────────────────────────────────────────────────────
  const prev = useCallback(
    () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)),
    [photos.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)),
    [photos.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onClose]);

  // Swipe support
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  // ── Slideshow ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (slideshowActive) {
      slideshowRef.current = setInterval(next, 4000);
    } else {
      clearInterval(slideshowRef.current);
    }
    return () => clearInterval(slideshowRef.current);
  }, [slideshowActive, next]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // ── Comments ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!photo?.id) return;
    fetch(`/api/photos/${photo.id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments))
      .catch(console.error);
  }, [photo?.id]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const res = await fetch(`/api/photos/${photo.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    });
    const newComment = await res.json();
    setComments((prev) => [...prev, newComment]);
    setCommentText('');
  };

  // ── Tagging ───────────────────────────────────────────────────────────────────
  const searchUsers = async (q) => {
    if (q.length < 2) {
      setTagSuggestions([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTagSuggestions(data.users);
  };

  const tagUser = async (userId) => {
    await fetch(`/api/photos/${photo.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setTagInput('');
    setTagSuggestions([]);
  };

  // ── Download ──────────────────────────────────────────────────────────────────
  const download = () => {
    const a = document.createElement('a');
    a.href = photo.originalUrl;
    a.download = `photo-${photo.id}.jpg`;
    a.click();
  };

  // ── Share ─────────────────────────────────────────────────────────────────────
  const share = async () => {
    const shareData = {
      title: 'Check out this photo!',
      text: photo.caption || 'Event photo',
      url: `${window.location.origin}/photos/${photo.id}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert('Link copied to clipboard!');
    }
  };

  if (!photo) return null;

  return (
    <div
      className="lightbox"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Backdrop */}
      <div className="lightbox__backdrop" onClick={onClose} />

      {/* Image area */}
      <div className="lightbox__image-area" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button
          className="lightbox__nav lightbox__nav--prev"
          onClick={prev}
          aria-label="Previous photo"
        >
          ‹
        </button>

        <img
          key={photo.id}
          src={photo.largeUrl}
          alt={photo.caption || 'Event photo'}
          className="lightbox__img"
        />

        <button
          className="lightbox__nav lightbox__nav--next"
          onClick={next}
          aria-label="Next photo"
        >
          ›
        </button>
      </div>

      {/* Controls bar */}
      <div className="lightbox__controls">
        <span className="lightbox__counter">
          {index + 1} / {photos.length}
        </span>

        <div className="lightbox__actions">
          <button
            onClick={() => setSlideshowActive((s) => !s)}
            aria-label="Toggle slideshow"
            aria-pressed={slideshowActive}
          >
            {slideshowActive ? '⏸ Pause' : '▶ Slideshow'}
          </button>
          <button onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            ⛶
          </button>
          <button onClick={download} aria-label="Download photo">
            ⬇ Download
          </button>
          <button onClick={share} aria-label="Share photo">
            ↗ Share
          </button>
          <button onClick={onClose} aria-label="Close lightbox">
            ✕
          </button>
        </div>
      </div>

      {/* Sidebar: info, tags, comments */}
      <div className="lightbox__sidebar">
        {/* Photo info */}
        <div className="lightbox__info">
          {photo.caption && <p className="lightbox__caption">{photo.caption}</p>}
          <p className="lightbox__meta">
            📅 {photo.dateTaken} · 📷 {photo.photographer}
          </p>
          {photo.exif && (
            <p className="lightbox__exif">
              {photo.exif.camera} · f/{photo.exif.aperture} · {photo.exif.iso} ISO
            </p>
          )}
        </div>

        {/* People tags */}
        <div className="lightbox__tags-section">
          <h3>Tag people</h3>
          <div className="lightbox__current-tags">
            {photo.tags?.map((tag) => (
              <span key={tag.userId} className="person-tag">
                {tag.name}
                <button
                  onClick={() =>
                    fetch(`/api/photos/${photo.id}/tags/${tag.userId}`, { method: 'DELETE' })
                  }
                  aria-label={`Remove tag for ${tag.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search user to tag…"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              searchUsers(e.target.value);
            }}
            className="lightbox__tag-input"
          />
          {tagSuggestions.length > 0 && (
            <ul className="tag-suggestions">
              {tagSuggestions.map((u) => (
                <li key={u.id}>
                  <button onClick={() => tagUser(u.id)}>
                    {u.name} (@{u.username})
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI tags */}
        {photo.aiTags?.length > 0 && (
          <div className="lightbox__ai-tags">
            <h3>AI detected</h3>
            <div className="tag-cloud">
              {photo.aiTags.map((t) => (
                <span key={t} className="tag tag--ai">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="lightbox__comments">
          <h3>Comments ({comments.length})</h3>
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id} className="comment">
                <strong>{c.authorName}</strong>
                <p>{c.text}</p>
                <time>{new Date(c.createdAt).toLocaleDateString()}</time>
              </li>
            ))}
          </ul>
          <div className="comment-form">
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            />
            <button onClick={submitComment} disabled={!commentText.trim()}>
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
