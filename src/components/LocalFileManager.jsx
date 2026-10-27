import React, { useState, useEffect, useRef } from 'react';
import {
  openLocalProjectFile,
  saveToLocalProjectFile,
  saveAsLocalProjectFile,
  exportBackupDownload,
  importBackupFromFile,
  subscribeFileStatus
} from '../api/client.js';

export default function LocalFileManager({ onDataReload }) {
  const [fileStatus, setFileStatus] = useState({
    hasActiveFile: false,
    fileName: 'Browser Storage (IndexedDB)',
    supportsFSA: false
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeFileStatus((status) => {
      setFileStatus(status);
    });

    // PWA install prompt handler
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Close menu on outside click
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const flashMessage = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleOpenLocalFile = async () => {
    try {
      setIsMenuOpen(false);
      const res = await openLocalProjectFile();
      flashMessage(`Loaded ${res.fileName}`);
      if (onDataReload) onDataReload();
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Could not open file: ' + err.message);
      }
    }
  };

  const handleSaveAs = async () => {
    try {
      setIsMenuOpen(false);
      const savedName = await saveAsLocalProjectFile();
      if (savedName) {
        flashMessage(`Saved to ${savedName}`);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Could not save file: ' + err.message);
      }
    }
  };

  const handleQuickSave = async () => {
    try {
      const savedName = await saveToLocalProjectFile();
      flashMessage(`Saved to ${savedName}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Could not save file: ' + err.message);
      }
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsMenuOpen(false);
      const filename = await exportBackupDownload();
      flashMessage(`Exported ${filename}`);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    (async () => {
      try {
        await importBackupFromFile(file);
        flashMessage(`Restored from ${file.name}`);
        if (onDataReload) onDataReload();
      } catch (err) {
        alert('Failed to restore backup: ' + err.message);
      }
    })();
    e.target.value = '';
    setIsMenuOpen(false);
  };

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }} ref={menuRef}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportBackup}
      />

      {fileStatus.saveError && <span role="alert" style={{color:"#fca5a5",fontSize:12}}>{fileStatus.saveError}</span>}
      {/* Storage Indicator Button */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: fileStatus.hasActiveFile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          border: `1px solid ${fileStatus.hasActiveFile ? '#10b981' : '#6366f1'}`,
          color: 'var(--text-primary, #f8fafc)',
          borderRadius: '6px',
          padding: '0.35rem 0.65rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
        title="Manage local file storage, backups, and app installation"
      >
        <span>{fileStatus.hasActiveFile ? '📂' : '💾'}</span>
        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileStatus.fileName}
        </span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
      </button>

      {fileStatus.hasActiveFile && (
        <button
          type="button"
          onClick={handleQuickSave}
          style={{
            background: 'var(--bg-tertiary, #334155)',
            border: '1px solid var(--border-color, #475569)',
            color: '#fff',
            borderRadius: '6px',
            padding: '0.35rem 0.55rem',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
          title="Save changes to active local file"
        >
          💾 Save
        </button>
      )}

      {/* PWA Install Button */}
      {installPrompt && (
        <button
          type="button"
          onClick={handleInstallPWA}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Install Bigfin Squid where supported by your browser"
        >
          📲 Install App
        </button>
      )}

      {statusMessage && (
        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
          ✓ {statusMessage}
        </span>
      )}

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            width: '260px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '0.4rem',
            gap: '0.25rem'
          }}
        >
          <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            Local File System
          </div>

          <button
            type="button"
            onClick={handleOpenLocalFile}
            style={menuItemStyle}
          >
            <span>📂</span>
            <div style={{ textAlign: 'left' }}>
              <div>Open Local Project File</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Load .json from your hard drive</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleSaveAs}
            style={menuItemStyle}
          >
            <span>💾</span>
            <div style={{ textAlign: 'left' }}>
              <div>Save As Local File…</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Save & link to a file on your disk</div>
            </div>
          </button>

          <div style={{ height: '1px', background: '#334155', margin: '0.3rem 0' }} />

          <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
            Backups & Portability
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            style={menuItemStyle}
          >
            <span>⬇️</span>
            <div style={{ textAlign: 'left' }}>
              <div>Export Backup File (.json)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Download complete backup</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={menuItemStyle}
          >
            <span>⬆️</span>
            <div style={{ textAlign: 'left' }}>
              <div>Restore from Backup (.json)</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Restore project from backup</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  background: 'none',
  border: 'none',
  color: '#f8fafc',
  padding: '0.5rem 0.6rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  textAlign: 'left',
  width: '100%',
  transition: 'background 0.15s',
  ':hover': {
    backgroundColor: '#334155'
  }
};
