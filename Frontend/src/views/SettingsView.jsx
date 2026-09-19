import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function SettingsView() {
  const { profile, setProfile, showToast } = useApp();

  const [formData, setFormData] = useState({
    name: profile.name,
    rollNo: profile.rollNo,
    email: 'aarav.sharma@nit.edu.in',
    phone: '+91 98765 43210',
    autoSyncDigilocker: true,
    recruiterVisibility: true,
    emailAlerts: true,
    smsAlerts: false
  });

  const handleSave = (e) => {
    e.preventDefault();
    setProfile((prev) => ({
      ...prev,
      name: formData.name,
      rollNo: formData.rollNo
    }));
    showToast('Settings saved successfully.', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">Preferences</span>
          <span className="badge badge-neutral">AICTE Account Services</span>
        </div>

        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Account Settings &amp; Data Preferences
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '750px' }}>
          Manage your DigiLocker identity link, consent permissions for campus recruitment, and notifications.
        </p>
      </section>

      {/* Settings Form Grid */}
      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Details */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>
              person
            </span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Personal Identity
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.25rem', display: 'block' }}>
                Full Legal Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.25rem', display: 'block' }}>
                University Roll Number
              </label>
              <input
                type="text"
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.25rem', display: 'block' }}>
                Institutional Email (.edu.in)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '0.25rem', display: 'block' }}>
                Registered Mobile
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Integration & Privacy Toggles */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '20px' }}>
              security
            </span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Integrations &amp; Permissions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Auto-sync DigiLocker / NAD
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Import verified semester transcripts automatically.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSyncDigilocker}
                onChange={(e) => setFormData({ ...formData, autoSyncDigilocker: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
              />
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Recruiter Visibility
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Allow campus recruiters to search and view your verified skills.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.recruiterVisibility}
                onChange={(e) => setFormData({ ...formData, recruiterVisibility: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
              />
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Placement Email Alerts
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Receive email alerts when new campus drives match your profile.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.emailAlerts}
                onChange={(e) => setFormData({ ...formData, emailAlerts: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
              Save Preferences
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
