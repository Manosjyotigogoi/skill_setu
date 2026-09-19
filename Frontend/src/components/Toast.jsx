import React from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  const iconName = isSuccess ? 'check_circle' : isWarning ? 'warning' : 'info';
  const iconColor = isSuccess ? '#4ADE80' : isWarning ? '#FBBF24' : '#60A5FA';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 200,
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        padding: '0.75rem 1.15rem',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        fontSize: '0.85rem',
        fontWeight: 500
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: iconColor }}>
        {iconName}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}
