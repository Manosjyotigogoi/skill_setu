import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// This page is accessed via the check-in email link:
//   /#/check-in/:id
// The check-in ID itself acts as the auth token — no login required.
export default function CheckInResponse({ id }) {
  const { fetchCheckInById, respondToCheckIn } = useApp();

  const [checkIn, setCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    currentEmploymentStatus: 'EMPLOYED',
    currentCompany: '',
    currentRole: '',
    currentPackage: '',
    wantsReferral: false,
    notes: ''
  });

  useEffect(() => {
    (async () => {
      const ci = await fetchCheckInById(id);
      if (!ci) {
        setError('Check-in not found. The link may have expired or is invalid.');
      } else if (ci.respondedAt) {
        setCheckIn(ci);
        setSubmitted(true);
      } else {
        setCheckIn(ci);
      }
      setLoading(false);
    })();
  }, [id, fetchCheckInById]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { checkIn: updated, error: err } = await respondToCheckIn(id, formData);
    if (err) {
      setError(err);
    } else if (updated) {
      setCheckIn(updated);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading check-in…</div>
      </div>
    );
  }

  if (error && !checkIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <div className="card" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center', color: 'var(--danger, #B91C1C)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>error</span>
          <h2 style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Check-in Not Found</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: '1.5rem' }}>
        <div className="card" style={{ padding: '2.5rem', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--success-bg, #ECFDF5)', color: 'var(--success, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>check_circle</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '1rem' }}>Thank you!</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
            Your employment status for cycle <strong>{checkIn.cycle}</strong> has been recorded.
            {checkIn.wantsReferral && ' We will reach out with matching opportunities shortly.'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1.5rem' }}>
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        {/* Header */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-info">Quarterly Check-in · {checkIn.cycle}</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Hello {checkIn.user?.name || 'there'}!
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Skill-Setu checks in every 4 months to track your employment journey.
            Please take 2 minutes to update your status. If you're looking for new
            opportunities, we can refer you to companies with matching open drives.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {/* Employment status */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.5rem' }}>
              Current Employment Status *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                { value: 'EMPLOYED', label: 'Employed', icon: 'work' },
                { value: 'OPEN_TO_WORK', label: 'Open to Work', icon: 'person_search' },
                { value: 'NOT_LOOKING', label: 'Not Looking', icon: 'do_not_disturb' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, currentEmploymentStatus: opt.value })}
                  className={formData.currentEmploymentStatus === opt.value ? 'btn btn-navy btn-sm' : 'btn btn-secondary btn-sm'}
                  style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{opt.icon}</span>
                  <span style={{ fontSize: '0.72rem' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Employment details (only if employed) */}
          {formData.currentEmploymentStatus === 'EMPLOYED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Current Company
                <input type="text" value={formData.currentCompany} onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })} className="input-field" placeholder="e.g. TCS Digital" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Current Role
                <input type="text" value={formData.currentRole} onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })} className="input-field" placeholder="e.g. Software Engineer" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Current Package (CTC)
                <input type="text" value={formData.currentPackage} onChange={(e) => setFormData({ ...formData, currentPackage: e.target.value })} className="input-field" placeholder="e.g. ₹12.5 LPA" />
              </label>
            </div>
          )}

          {/* Wants referral */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.wantsReferral} onChange={(e) => setFormData({ ...formData, wantsReferral: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)' }} />
            <span>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>I want to be referred for new opportunities</span>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>We'll match you with companies hiring for your skills</span>
            </span>
          </label>

          {/* Notes */}
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
            Additional Notes (optional)
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={3} placeholder="Any updates, achievements, or career changes you'd like to share with the placement cell?" style={{ resize: 'vertical' }} />
          </label>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
            {submitting ? 'Submitting…' : 'Submit Response'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '1.5rem' }}>
          Skill-Setu (Skill-सेतु) · AICTE Sovereign Education Rail
        </p>
      </div>
    </div>
  );
}
