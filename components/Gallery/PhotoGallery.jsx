import { useState, useEffect, useRef, useCallback } from 'react';
import Lightbox from './Lightbox';

/**
 * PhotoGallery — masonry grid with infinite scroll, filters, sort, and lightbox
 */
export default function PhotoGallery({ eventId }) {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [filters, setFilters] = useState({ album: '', date: '', photographer: '' });
  const [sort, setSort] = useState('newest');
  const [albums, setAlbums] = useState([]);
  const loaderRef = useRef(null);

  // ── Fetch photos ─────────────────────────────────────────────────────────────
  const fetchPhotos = useCallback(
    async (pageNum, reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          eventId,
          page: pageNum,
          limit: 30,
          sort,
          ...(filters.album && { album: filters.album }),
          ...(filters.date && { date: filters.date }),
          ...(filters.photographer && { photographer: filters.photographer }),
        });

        const res = await fetch(`/api/photos?${params}`);
        const data = await res.json();

        setPhotos((prev) => (reset ? data.photos : [...prev, ...data.photos]));
        setHasMore(data.hasMore);
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setLoading(false);
      }
    },
    [eventId, sort, filters]
  );

  // Reset on filter/sort change
  useEffect(() => {
    setPage(1);
    fetchPhotos(1, true);
  }, [sort, filters]);

  // Fetch next page
  useEffect(() => {
    if (page > 1) fetchPhotos(page);
  }, [page]);

  // ── Infinite scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // ── Albums for filter dropdown ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/albums?eventId=${eventId}`)
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums))
      .catch(console.error);
  }, [eventId]);

  // ── Like / Unlike ─────────────────────────────────────────────────────────────
  const toggleLike = async (photoId) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const method = photo.likedByMe ? 'DELETE' : 'POST';
    await fetch(`/api/photos/${photoId}/like`, { method });

    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="photo-gallery">
      {/* Controls */}
      <div className="gallery-controls">
        <select
          value={filters.album}
          onChange={(e) => setFilters((f) => ({ ...f, album: e.target.value }))}
          aria-label="Filter by album"
        >
          <option value="">All albums</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          aria-label="Filter by date"
        />

        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort photos">
          <option value="newest">Newest</option>
          <option value="most_liked">Most Liked</option>
          <option value="most_viewed">Most Viewed</option>
        </select>
      </div>

      {/* Masonry grid */}
      <div className="masonry-grid" role="list">
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="masonry-item"
            role="listitem"
            onClick={() => setLightboxIndex(idx)}
          >
            {/* Progressive loading: blur-up */}
            <img
              src={photo.thumbnailUrl}
              data-src={photo.mediumUrl}
              alt={photo.caption || `Event photo by ${photo.photographer}`}
              loading="lazy"
              className="masonry-item__img"
              srcSet={`${photo.smallUrl} 150w, ${photo.mediumUrl} 400w, ${photo.largeUrl} 800w`}
              sizes="(max-width: 600px) 150px, (max-width: 1200px) 400px, 800px"
            />

            {/* AI tags overlay */}
            {photo.aiTags?.length > 0 && (
              <div className="masonry-item__tags" aria-label="AI tags">
                {photo.aiTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="masonry-item__actions">
              <button
                className={`btn-icon ${photo.likedByMe ? 'btn-icon--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(photo.id);
                }}
                aria-label={photo.likedByMe ? 'Unlike' : 'Like'}
                aria-pressed={photo.likedByMe}
              >
                ♥ {photo.likes}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loaderRef} className="gallery-loader" aria-live="polite">
        {loading && <span>Loading more photos…</span>}
        {!hasMore && photos.length > 0 && <span>All photos loaded</span>}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
