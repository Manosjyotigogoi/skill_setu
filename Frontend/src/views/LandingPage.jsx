import React from 'react';
import BrandLogo from '../components/BrandLogo';
import { useApp } from '../context/AppContext';

export default function LandingPage() {
  const { setActiveTab } = useApp();

  const stats = [
    { value: '1,240+', label: 'Technical Institutions', icon: 'account_balance' },
    { value: '98.2%', label: 'Credential Verification Rate', icon: 'verified' },
    { value: '₹14.2 LPA', label: 'Average Placement CTC', icon: 'payments' },
    { value: '100%', label: 'National Registry Verified', icon: 'lock' },
  ];

  const pillars = [
    {
      icon: 'school',
      title: 'Academic Credential Ingestion',
      desc: 'Parses academic transcripts, AICTE syllabi, and institutional records into NSQF Level 7 verified competency profiles.'
    },
    {
      icon: 'verified_user',
      title: 'Proctored Skill Verification',
      desc: 'Standardized proctored evaluations mapped to National Occupational Standards (NOS) and NCrF credit criteria.'
    },
    {
      icon: 'work',
      title: 'Direct Campus Placement',
      desc: 'Direct corporate recruitment pipeline connecting verified candidate portfolios with Tier-1 recruiters without resume fraud.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="site-header">
        <div
          className="layout-container"
          style={{
            height: '4.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BrandLogo variant="compact" onClick={() => setActiveTab('landing')} />
            <span className="badge badge-neutral" style={{ display: 'none' }} id="gov-sublabel">
              MoE &bull; AICTE Framework
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-success">
              &check; Sovereign ID Linked
            </span>
            <button
              onClick={() => setActiveTab('auth')}
              className="btn btn-primary btn-sm"
            >
              Sign In &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={{ padding: '3.5rem 0 4rem' }}>
          <div className="layout-container">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', maxWidth: '760px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-warning">AICTE &bull; NEP 2020 Framework</span>
                  <span className="badge badge-info">National Skill Rail</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h1 style={{ fontSize: 'clamp(2.1rem, 4vw, 3rem)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                    Where Skill Meets Opportunity
                  </h1>
                  <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '560px' }}>
                    India's unified national bridge unifying university curricula, verified skill credentials, and corporate campus placement pipelines.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="btn btn-primary"
                    style={{ padding: '0.85rem 1.65rem' }}
                  >
                    Enter Student Portal
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                  <span>&check; National Registry Live Sync</span>
                  <span>&bull;</span>
                  <span>&check; Cryptographic Credential Ledger</span>
                  <span>&bull;</span>
                  <span>&check; Zero Resume Fraud</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: '#FFFFFF', padding: '2.5rem 0' }}>
          <div className="layout-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {stats.map((s) => (
                <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                    {s.icon}
                  </span>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 Pillars */}
        <section style={{ padding: '4.5rem 0' }}>
          <div className="layout-container">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span className="badge badge-info" style={{ marginBottom: '0.75rem' }}>Platform Architecture</span>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                How Skill-Setu Bridges the Opportunity Gap
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0.5rem auto 0 auto', lineHeight: 1.6 }}>
                Connecting students, universities, and corporate recruiters through verifiable skill standards.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {pillars.map((p) => (
                <div key={p.title} className="card" style={{ padding: '2rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      color: 'var(--secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      {p.icon}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {p.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section style={{ paddingBottom: '4.5rem' }}>
          <div className="layout-container">
            <div
              className="card"
              style={{
                padding: '3rem 2.5rem',
                textAlign: 'center',
                background: 'var(--primary)',
                borderColor: 'var(--primary)',
                color: '#FFFFFF'
              }}
            >
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                Ready to verify your skills and unlock campus placement?
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)', maxWidth: '560px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
                Join over 1,240 technical universities already verified under the national skill credential framework.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveTab('auth')}
                  className="btn btn-primary"
                  style={{ padding: '0.85rem 1.75rem' }}
                >
                  Get Started Now &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: '#FFFFFF', padding: '2.5rem 0' }}>
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
            <BrandLogo variant="compact" onClick={() => setActiveTab('landing')} />
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem' }}>
              <button
                onClick={() => setActiveTab('auth')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Student Login
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Institutional Portal
              </button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span>&copy; 2026 <strong>Skill-Setu (Skill-सेतु)</strong>. Ministry of Education &amp; AICTE.</span>
            <span>National Academic Depository (NAD) Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
