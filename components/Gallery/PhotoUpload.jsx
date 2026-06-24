import { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
const THUMBNAIL_SIZES = { small: 150, medium: 400, large: 800 };

/**
 * PhotoUpload — bulk drag-and-drop upload component
 * Supports JPEG, PNG, HEIC, WebP up to 10MB each
 */
export default function PhotoUpload({ eventId, albumId, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({}); // { fileId: 0-100 }
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      return `${file.name}: unsupported format (JPEG, PNG, HEIC, WebP only)`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: exceeds 10 MB limit`;
    }
    return null;
  };

  // ── File selection ───────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming) => {
    const newErrors = [];
    const valid = [];

    Array.from(incoming).forEach((file) => {
      const err = validateFile(file);
      if (err) {
        newErrors.push(err);
      } else {
        valid.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          exif: null, // populated after upload
        });
      }
    });

    setErrors((prev) => [...prev, ...newErrors]);
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Upload ───────────────────────────────────────────────────────────────────
  const uploadFile = async (item) => {
    const formData = new FormData();
    formData.append('photo', item.file);
    formData.append('eventId', eventId);
    formData.append('albumId', albumId || '');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress((prev) => ({
            ...prev,
            [item.id]: Math.round((e.loaded / e.total) * 100),
          }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.open('POST', '/api/photos/upload');
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setErrors([]);

    const results = [];
    // Upload concurrently in batches of 3
    for (let i = 0; i < files.length; i += 3) {
      const batch = files.slice(i, i + 3);
      const settled = await Promise.allSettled(batch.map(uploadFile));
      settled.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          results.push(r.value);
        } else {
          setErrors((prev) => [...prev, `${batch[idx].file.name}: ${r.reason.message}`]);
        }
      });
    }

    setUploading(false);
    setFiles([]);
    setProgress({});
    onUploadComplete?.(results);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="photo-upload">
      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? 'drop-zone--active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload photos — click or drag and drop"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.heic,.webp"
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="drop-zone__icon">📷</div>
        <p className="drop-zone__primary">Drag photos here or click to browse</p>
        <p className="drop-zone__secondary">JPEG, PNG, HEIC, WebP · max 10 MB each</p>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <ul className="upload-errors" role="alert">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {/* File preview grid */}
      {files.length > 0 && (
        <div className="upload-preview">
          <p className="upload-preview__count">
            {files.length} photo{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="upload-preview__grid">
            {files.map((item) => (
              <div key={item.id} className="preview-item">
                <img src={item.preview} alt={item.file.name} className="preview-item__img" />
                {progress[item.id] !== undefined && (
                  <div className="preview-item__progress">
                    <div
                      className="preview-item__bar"
                      style={{ width: `${progress[item.id]}%` }}
                      role="progressbar"
                      aria-valuenow={progress[item.id]}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                    <span className="preview-item__pct">{progress[item.id]}%</span>
                  </div>
                )}
                {!uploading && (
                  <button
                    className="preview-item__remove"
                    onClick={() => removeFile(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="btn btn--primary" onClick={handleUpload} disabled={uploading}>
            {uploading
              ? 'Uploading…'
              : `Upload ${files.length} photo${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
