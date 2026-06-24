import { useState } from 'react';
import { categories, topics, difficultyLevels } from '../../data/resourcesData';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--t1)',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  color: 'var(--t2)',
  marginBottom: '4px',
};

export default function ResourceUploadModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    topic: '',
    tags: '',
    difficultyLevel: '',
    uploadedBy: '',
    fileUrl: '',
    accessLevel: 'public',
  });

  if (!open) return null;

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, tags, createdAt: new Date().toISOString() });
    setForm({
      title: '',
      description: '',
      category: 'other',
      topic: '',
      tags: '',
      difficultyLevel: '',
      uploadedBy: '',
      fileUrl: '',
      accessLevel: 'public',
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--t1)' }}>Share a Resource</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t3)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Resource Title *</label>
            <input
              required
              value={form.title}
              onChange={handleChange('title')}
              placeholder="e.g. Intro to DSA Notes"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Brief description of the resource…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>File / Link URL</label>
            <input
              value={form.fileUrl}
              onChange={handleChange('fileUrl')}
              placeholder="https://drive.google.com/… or GitHub link"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={handleChange('category')} style={inputStyle}>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Topic</label>
              <select value={form.topic} onChange={handleChange('topic')} style={inputStyle}>
                <option value="">Select topic</option>
                {topics.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select
                value={form.difficultyLevel}
                onChange={handleChange('difficultyLevel')}
                style={inputStyle}
              >
                <option value="">Any</option>
                {difficultyLevels.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Access Level</label>
              <select
                value={form.accessLevel}
                onChange={handleChange('accessLevel')}
                style={inputStyle}
              >
                <option value="public">🌐 Public</option>
                <option value="members">🔵 Members Only</option>
                <option value="attendees">🎟️ Attendees Only</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={handleChange('tags')}
              placeholder="e.g. Python, DSA, Beginner"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Your Name</label>
            <input
              value={form.uploadedBy}
              onChange={handleChange('uploadedBy')}
              placeholder="Your name or alias"
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--t2)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim()}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: form.title.trim() ? '#CC1111' : 'var(--border)',
                color: '#fff',
                cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Submit Resource
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
