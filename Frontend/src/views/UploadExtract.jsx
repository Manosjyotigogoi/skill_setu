import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function UploadExtract() {
  const {
    uploadedFiles,
    extractionInProgress,
    extractionStep,
    uploadDocument,
    showToast,
    userRole
  } = useApp();

  const [dragOver, setDragOver] = useState(false);
  const isTrainee = userRole === 'trainee';

  const handleFile = (file) => {
    if (!file) return;
    // Validate roughly — backend enforces too, but better UX to fail fast.
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
    const maxBytes = 10 * 1024 * 1024; // 10 MB to match backend UPLOAD_MAX_MB
    if (file.size > maxBytes) {
      showToast(`File too large — max 10 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`, 'error');
      return;
    }
    if (allowed.length && !allowed.includes(file.type) && !file.name.match(/\.(pdf|docx?|png|jpe?g)$/i)) {
      showToast('Unsupported file type. Use PDF, DOC/DOCX, PNG, or JPEG.', 'error');
      return;
    }
    uploadDocument(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      // Reset value so picking the same file twice still fires onChange.
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified_user</span>
            {isTrainee ? 'NCVET & NSDC Framework' : 'AICTE & NCVET Framework'}
          </span>
          <span className="badge badge-warning">
            {isTrainee ? 'Skill India Mission' : 'NEP 2020 Compliant'}
          </span>
          <span className="badge badge-neutral">
            National Registry Linked
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '720px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
              {isTrainee ? 'Upload Training Certificate & Skill Records' : 'Upload Academic Records, CV & Skill Verification'}
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {isTrainee
                ? 'Upload your vocational certificate, ITI completion document, or skill assessment scorecard. AI extracts competencies directly to your sovereign profile.'
                : 'Upload your resume/CV, semester grade cards, course syllabi, or internship certificates. AI validates curriculum competencies against national NSQF Level standards.'}
            </p>
          </div>


          <button
            onClick={() => showToast('Connecting to National Academic Gateway (NAD)...', 'info')}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
            title="NAD sync is coming soon — for now, please upload documents manually."
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>sync</span>
            <span>Sync Academic Registry</span>
          </button>
        </div>
      </section>

      {/* Grid: Upload Box & Extracted Records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Drag & Drop Card */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Document Upload</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDFs, DOCX, PNG, or JPEG — up to 10 MB</p>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              border: dragOver ? '2px dashed var(--secondary)' : '2px dashed var(--border-medium)',
              background: dragOver ? 'var(--secondary-tint)' : 'var(--surface-subtle)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              disabled={extractionInProgress}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: extractionInProgress ? 'not-allowed' : 'pointer'
              }}
            />

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--secondary)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                cloud_upload
              </span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {extractionInProgress ? 'Uploading & extracting…' : 'Drag & drop files here, or browse'}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '360px' }}>
              PDFs are parsed for skills automatically; DOC/DOCX/images are stored but not yet parsed by the OCR pipeline.
            </p>
          </div>

        </div>

        {/* Right: Parsed Records Ledger */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Parsed Records &amp; Extracted Skills
            </h2>
            <span className="badge badge-neutral">
              {uploadedFiles.length} Documents
            </span>
          </div>

          {extractionInProgress && (
            <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {extractionStep <= 1 && 'Uploading the document to the Skill-Setu registry…'}
              {extractionStep === 2 && 'Extracting course modules and skills…'}
              {extractionStep >= 3 && 'Mapping extracted skills to NSQF standards…'}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {uploadedFiles.length === 0 && !extractionInProgress && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No documents uploaded yet. Drop a PDF above to get started.
              </p>
            )}
            {uploadedFiles.map((doc) => {
              const isParsed = doc.status === 'PARSED';
              const isParsing = doc.status === 'PARSING';
              const isFailed = doc.status === 'FAILED';
              return (
                <div
                  key={doc.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          color: isFailed ? 'var(--danger, #B91C1C)' : isParsing ? 'var(--warning, #B45309)' : 'var(--success, #15803D)',
                          fontSize: '18px',
                          flexShrink: 0
                        }}
                      >
                        {isFailed ? 'error' : isParsing ? 'sync' : 'check_circle'}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </span>
                    </div>
                    {isParsed && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Verified</span>}
                    {isParsing && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Parsing…</span>}
                    {isFailed && <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>Failed</span>}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Size: {doc.size} &bull; Processed: {doc.uploadDate}
                  </div>

                  {Array.isArray(doc.extractedSkills) && doc.extractedSkills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                      {doc.extractedSkills.map((sk, idx) => (
                        <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.725rem' }}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
