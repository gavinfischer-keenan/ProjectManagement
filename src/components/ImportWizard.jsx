import React, { useState, useRef, useCallback } from 'react';

export default function ImportWizard({ onImportComplete }) {
  const [step, setStep] = useState(1); // 1 = upload, 2 = preview, 3 = done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  /* Format bytes */
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  /* Select or drop a file */
  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Please select an .xlsx or .xls file.');
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  /* Upload & parse */
  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }
      const result = await res.json();
      setPreview(result.tasks || result);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* Confirm import */
  async function handleConfirm() {
    setLoading(true);
    try {
      // The import already happened on upload; we just confirm
      setStep(3);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* Reset */
  function handleReset() {
    setStep(1);
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
  }

  /* Drag handlers */
  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  /* Build tree from flat list */
  function buildTree(tasks) {
    if (!Array.isArray(tasks)) return [];
    const map = {};
    const roots = [];
    for (const t of tasks) {
      map[t.id] = { ...t, children: [] };
    }
    for (const t of tasks) {
      if (t.parentId && map[t.parentId]) {
        map[t.parentId].children.push(map[t.id]);
      } else {
        roots.push(map[t.id]);
      }
    }
    return roots;
  }

  function renderTreeNodes(nodes) {
    return nodes.map((node) => (
      <React.Fragment key={node.id}>
        <div className={node.children.length > 0 ? 'tree-node tree-node--parent' : 'tree-node tree-node--child'}>
          {node.name}
        </div>
        {node.children.length > 0 && (
          <div style={{ paddingLeft: '1rem' }}>
            {renderTreeNodes(node.children)}
          </div>
        )}
      </React.Fragment>
    ));
  }

  return (
    <div>
      <h2 className="section-title">📥 Import Project Plan</h2>

      {/* Wizard Steps Indicator */}
      <div className="wizard-steps">
        <div className={`wizard-step ${step === 1 ? 'wizard-step--active' : step > 1 ? 'wizard-step--done' : ''}`}>
          <span className="wizard-step__number">{step > 1 ? '✓' : '1'}</span>
          <span>Upload</span>
        </div>
        <div className="wizard-connector" />
        <div className={`wizard-step ${step === 2 ? 'wizard-step--active' : step > 2 ? 'wizard-step--done' : ''}`}>
          <span className="wizard-step__number">{step > 2 ? '✓' : '2'}</span>
          <span>Preview</span>
        </div>
        <div className="wizard-connector" />
        <div className={`wizard-step ${step === 3 ? 'wizard-step--active' : ''}`}>
          <span className="wizard-step__number">{step === 3 ? '✓' : '3'}</span>
          <span>Done</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="fade-in-up">
          <div
            className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="dropzone__icon">📂</div>
            <div className="dropzone__text">
              {file ? file.name : 'Drop your Excel file here'}
            </div>
            <div className="dropzone__subtext">
              {file ? formatSize(file.size) : 'or click to browse — .xlsx, .xls'}
            </div>
            {file && (
              <div className="dropzone__file-info">
                📎 {file.name} ({formatSize(file.size)})
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--coral)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn--primary btn--lg"
              disabled={!file || loading}
              onClick={handleUpload}
            >
              {loading ? 'Uploading…' : 'Upload & Preview'}
            </button>
          </div>

          {loading && <div className="spinner" />}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div className="fade-in-up">
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              📋 Preview ({Array.isArray(preview) ? preview.length : 0} tasks)
            </h3>
            <div className="tree-preview glass-panel-sm" style={{ maxHeight: 400, overflow: 'auto' }}>
              {Array.isArray(preview) ? renderTreeNodes(buildTree(preview)) : (
                <div className="empty-state__subtext">No tasks parsed.</div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--coral)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={handleReset}>
              ← Back
            </button>
            <button
              className="btn btn--primary btn--lg"
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? 'Importing…' : 'Confirm Import'}
            </button>
          </div>

          {loading && <div className="spinner" />}
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="success-anim">
          <div className="success-anim__icon">🎉</div>
          <div className="success-anim__text">Import Complete!</div>
          <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Your project plan has been imported successfully.
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn--secondary" onClick={handleReset}>
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
