import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import BrandLogo from './components/BrandLogo';

// Views
import LandingPage from './views/LandingPage';
import AuthView from './views/AuthView';
import StudentDashboard from './views/StudentDashboard';
import UploadExtract from './views/UploadExtract';
import JobMatching from './views/JobMatching';
import SkillGapCourses from './views/SkillGapCourses';
import PlacementAdmin from './views/PlacementAdmin';
import DigitalDossier from './views/DigitalDossier';
import AdminPortal from './views/AdminPortal';
import CheckInResponse from './views/CheckInResponse';
import EmployerApplicantVerification from './views/EmployerApplicantVerification';

// Hash-based routing for public pages (accessed via link/QR, no auth required).
// Format: #/check-in/<checkInId> or #/verify/<skillSetuId>
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function CheckInRoute() {
  const hash = useHashRoute();
  // Match #/check-in/<id>
  const match = hash.match(/^#\/check-in\/(.+)$/);
  if (!match) return null;
  return <CheckInResponse id={match[1]} />;
}

function ApplicantVerificationRoute() {
  const hash = useHashRoute();
  const hashMatch = hash.match(/^#\/(?:verify|applicant)\/(.+)$/);
  const pathMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/(?:verify|applicant)\/(.+)$/) : null;
  const queryMatch = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;
  const skillSetuId = hashMatch ? decodeURIComponent(hashMatch[1]) : (pathMatch ? decodeURIComponent(pathMatch[1]) : queryMatch);

  return <EmployerApplicantVerification skillSetuId={skillSetuId} />;
}

function AuthenticatedShell() {
  const { activeTab, setActiveTab, triggerLogout, profile } = useApp();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />

      <main className="layout-container" style={{ flex: 1, paddingTop: '1.75rem', paddingBottom: '3rem' }}>
        {activeTab === 'student-dashboard' && <StudentDashboard />}
        {activeTab === 'upload-and-extract' && <UploadExtract />}
        {activeTab === 'job-matching' && <JobMatching />}
        {activeTab === 'skill-gap-and-courses' && <SkillGapCourses />}
        {activeTab === 'placement-cell-admin' && <PlacementAdmin />}
        {activeTab === 'user-id' && <DigitalDossier />}
        {activeTab === 'applicant-verification' && (
          <EmployerApplicantVerification
            skillSetuId={profile?.skillSetuId || profile?.aicteId || profile?.id}
          />
        )}
      </main>

      {/* Clean Modern Institutional Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: '#FFFFFF',
          padding: '2.5rem 0 2rem 0',
          marginTop: 'auto'
        }}
      >
        <div
          className="layout-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '2.5rem'
            }}
          >
            {/* Footer Brand Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '380px' }}>
              <BrandLogo variant="header" onClick={() => setActiveTab('student-dashboard')} />
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                National digital bridge unifying academic curricula, verified skill credentials, and corporate placement pipelines under AICTE and NEP 2020.
              </p>
            </div>

            {/* Quick Links */}
            <div style={{ display: 'flex', gap: '3.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Student Portal
                </span>
                <button
                  onClick={() => setActiveTab('student-dashboard')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Dashboard Overview
                </button>
                <button
                  onClick={() => setActiveTab('upload-and-extract')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Upload &amp; Extract
                </button>
                <button
                  onClick={() => setActiveTab('job-matching')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Campus Recruitment
                </button>
                <button
                  onClick={() => setActiveTab('user-id')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Profile &amp; Documents
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Institutional
                </span>
                <button
                  onClick={() => setActiveTab('skill-gap-and-courses')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  SWAYAM / NPTEL Catalog
                </button>
                <button
                  onClick={() => setActiveTab('user-id')}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Profile Preferences
                </button>
                <button
                  onClick={triggerLogout}
                  style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '0.825rem', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Sign Out &rarr;
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.75rem',
              color: 'var(--text-light)'
            }}
          >
            <div>
              &copy; 2026 <strong>Skill-Setu (Skill-सेतु)</strong>. Ministry of Education &amp; Skill Development.
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Privacy Policy</span>
              <span>&bull;</span>
              <span>Terms of Service</span>
              <span>&bull;</span>
              <span>National Academic Depository (NAD)</span>
            </div>
          </div>
        </div>
      </footer>

      <Toast />
    </div>
  );
}

function MainContent() {
  const { isAuthenticated, isAuthBooting, activeTab, userRole } = useApp();

  // Check-in response page (accessed via email link, no auth needed).
  // This is checked FIRST so it bypasses the auth-boot splash.
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (hash.startsWith('#/check-in/')) {
    return <CheckInRoute />;
  }
  if (
    hash.startsWith('#/verify') ||
    hash.startsWith('#/applicant') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/applicant')
  ) {
    return <ApplicantVerificationRoute />;
  }

  // While we are probing GET /api/auth/me on first mount, render a minimal
  // splash instead of the landing page (avoids a flash of the wrong screen).
  if (isAuthBooting) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-canvas)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          gap: '0.75rem'
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ animation: 'spin 1s linear infinite', fontSize: '24px' }}
        >
          progress_activity
        </span>
        <span>Restoring your Skill-Setu session…</span>
      </div>
    );
  }

  // If unauthenticated or navigating pre-auth views (landing/auth)
  if (!isAuthenticated || activeTab === 'landing' || activeTab === 'auth') {
    return (
      <>
        {activeTab === 'auth' ? <AuthView /> : <LandingPage />}
        <Toast />
      </>
    );
  }

  // Admins land on the AdminPortal (full-screen, replaces AuthenticatedShell).
  // Students/trainees are blocked from the admin portal even if they
  // manually switch activeTab — the role check is authoritative.
  if (['admin', 'university_admin', 'government_admin'].includes(userRole)) {
    return (
      <>
        <AdminPortal />
        <Toast />
      </>
    );
  }

  // A student/trainee somehow ended up on an admin tab — bounce them back
  // to the student dashboard instead of rendering the admin portal.
  if (activeTab === 'placement-cell-admin' || activeTab === 'admin-portal') {
    return <AuthenticatedShell />;
  }

  return <AuthenticatedShell />;
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
