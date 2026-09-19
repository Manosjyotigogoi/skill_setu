import React from 'react';

/**
 * Clean National Emblem / Brand Mark Vector
 * Replaced bloated WebGL ThreeJS canvas with clean, high-performance SVG vector
 */
export default function ThreeJSEmblem({ width = '100%', height = '100%', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <div
        style={{
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '2px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(16, 42, 67, 0.06)',
          padding: '1.5rem',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: '#102A43'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
            account_balance
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#102A43' }}>
          National Civic Portal
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
          AICTE &amp; NEP 2020 Framework
        </div>
      </div>
    </div>
  );
}
