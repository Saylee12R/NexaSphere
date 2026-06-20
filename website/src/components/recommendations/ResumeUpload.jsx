import { useState, useRef } from 'react';
import '../../styles/resume.css';

export default function ResumeUpload({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError('File exceeds the 5 MB size limit. Please upload a smaller PDF.');
      return;
    }
    setError('');
    onUpload(f);
  };

  return (
    <div
      className={`uploader-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="upload-prompt">
        <span className="upload-icon">⬆</span>
        <p className="upload-title">Drop your PDF resume here</p>
        <p className="upload-sub">PDF only · Max 5MB</p>
      </div>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
