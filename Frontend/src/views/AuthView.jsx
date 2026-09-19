import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

// Three auth modes the form can be in:
//   'login'     — identifier + password (works for student/trainee/admin)
//   'signup'    — name + email + phone + password + accountType
//   'otp-request' — identifier only → triggers OTP send
//   'otp-verify'  — 6-digit OTP entry → finalizes login
//
// Backend reference:
//   POST /api/auth/register { name, email, phone, password, accountType } → { user }
//   POST /api/auth/login    { identifier, password }                       → { user }
//   POST /api/auth/otp/request { identifier }                              → { message, devOtp? }
//   POST /api/auth/otp/verify  { identifier, otp }                         → { user }

export default function AuthView() {
  const { completeLogin, setActiveTab, showToast } = useApp();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'organization-signup'
  const [authStep, setAuthStep] = useState('credentials'); // 'credentials' | 'otp-request' | 'otp-verify'
  const [inputMethod, setInputMethod] = useState('phone'); // 'phone' | 'email'
  const [loginRole, setLoginRole] = useState('student');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    accountType: 'student',
    // Academic details
    rollNo: '',
    branch: '',
    degree: '',
    academicYear: '',
    institution: '',
    cgpa: '',
    // Experience
    experienceYears: '',
    // Skills + courses (comma-separated input → split into arrays)
    selfReportedSkills: '',
    priorCourses: '',
    preferredJobLocations: ''
    ,organizationName: ''
    ,organizationType: 'university'
    ,organizationCode: ''
    ,programCode: ''         // For trainee signup – the training program code
    ,customJoinCode: ''     // Admin: custom join code for the institution
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentAccepted, setConsentAccepted] = useState(true);

  const updateSignupData = (field, value) => {
    setSignupData((current) => ({ ...current, [field]: value }));
  };

  const resetErrors = () => {
    setError(null);
    setDevOtpHint(null);
  };

  // ---- Submit handlers ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    resetErrors();
    setLoading(true);
    try {
      if (mode === 'organization-signup') {
        const { user } = await api.post('/auth/register-organization', {
          name: signupData.organizationName,
          type: signupData.organizationType,
          adminName: signupData.name,
          email: signupData.email,
          password: signupData.password,
          customJoinCode: signupData.customJoinCode || undefined
        });
        completeLogin(user, 'organization-signup');
      } else if (mode === 'signup') {
        // Registration — collect all profile fields so the AI can personalize
        // job + course recommendations immediately.
        const commaSplit = (s) =>
          (s || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);

        const cgpaNum = parseFloat(signupData.cgpa);
        const expNum = parseInt(signupData.experienceYears, 10);

        const { user } = await api.post('/auth/register', {
          name: signupData.name,
          email: signupData.email || undefined,
          phone: signupData.phone || undefined,
          password: signupData.password,
          accountType: signupData.accountType,
          organizationCode: signupData.organizationCode || undefined,
          programCode: signupData.accountType === 'trainee' ? (signupData.programCode || undefined) : undefined,
          // Academic details
          rollNo: signupData.rollNo || undefined,
          branch: signupData.branch || undefined,
          degree: signupData.degree || undefined,
          academicYear: signupData.academicYear || undefined,
          institution: signupData.institution || undefined,
          cgpa: Number.isFinite(cgpaNum) ? cgpaNum : undefined,
          // Experience
          experienceYears: Number.isFinite(expNum) ? expNum : undefined,
          // Skills + courses (comma-separated → arrays)
          selfReportedSkills: commaSplit(signupData.selfReportedSkills),
          priorCourses: commaSplit(signupData.priorCourses),
          preferredJobLocations: commaSplit(signupData.preferredJobLocations)
        });
        completeLogin(user, `signup-${signupData.accountType}`);
      } else if (authStep === 'credentials') {
        if (loginRole === 'admin') {
          // Admins MUST use password auth. Treat credential as identifier.
          const { user } = await api.post('/auth/login', {
            identifier: credential,
            password
          });
          completeLogin(user, 'admin');
        } else if (inputMethod === 'email' && password) {
          // Email + password fast path
          const { user } = await api.post('/auth/login', {
            identifier: credential,
            password
          });
          completeLogin(user, 'password');
        } else {
          // Phone/email → request OTP
          await api.post('/auth/otp/request', { identifier: credential });
          setAuthStep('otp-verify');
          showToast('OTP sent to your registered contact.', 'info');
        }
      } else if (authStep === 'otp-verify') {
        const { user } = await api.post('/auth/otp/verify', {
          identifier: credential,
          otp
        });
        completeLogin(user, 'otp');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err) => {
    if (err instanceof ApiError) {
      setError(err.message);
      // Backend echoes the OTP in dev mode for testing without an SMS gateway.
      if (err.payload && typeof err.payload === 'object' && err.payload.devOtp) {
        setDevOtpHint(err.payload.devOtp);
      }
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  // "Login with Google" — redirects to the backend's Google OAuth endpoint.
  // The backend route /api/auth/google is handled by passport-google-oauth20
  // (see backend/src/routes/authRoutes.js). If Google OAuth credentials are
  // not configured, the button surfaces a clear error instead of faking a login.
  const handleGoogleLogin = () => {
    // In dev with the Vite proxy, this hits the backend directly.
    // In production, set VITE_API_URL to the absolute backend URL.
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${baseUrl}/auth/google`;
  };

  const switchMode = (next) => {
    setMode(next);
    setAuthStep('credentials');
    resetErrors();
    setPassword('');
    setOtp('');
  };

  const switchInputMethod = (next) => {
    setInputMethod(next);
    setCredential('');
    resetErrors();
  };

  const trustCards = [
    {
      icon: 'verified_user',
      title: 'National Credential Sync',
      desc: 'Verified academic records mapped directly to your national student profile.'
    },
    {
      icon: 'bolt',
      title: 'Direct Campus Drive Access',
      desc: 'Automated eligibility screening for recruitment drives at TCS, Infosys, Zoho, and 120+ employers.'
    },
    {
      icon: 'badge',
      title: 'Sovereign Digital Dossier',
      desc: '1-click cryptographically signed credential passport shared securely with recruiters.'
    }
  ];

  // ---- Button labels & headers ----
  const headerTitle =
    mode === 'signup' || mode === 'organization-signup'
      ? 'Create Your Skill-Setu Account'
      : authStep === 'otp-verify'
      ? 'Enter the OTP we just sent'
      : 'Sign In to Skill-Setu';

  const headerSubtitle =
    mode === 'signup'
      ? 'Join as a student or trainee'
      : authStep === 'otp-verify'
      ? `A 6-digit code was sent to ${credential}`
      : 'Choose your verification method';

  const submitLabel =
    mode === 'signup' || mode === 'organization-signup'
      ? 'Create Account & Continue'
      : authStep === 'otp-verify'
      ? 'Verify & Enter Portal'
      : loginRole === 'admin' || (inputMethod === 'email' && password)
      ? 'Sign In'
      : 'Send OTP & Continue';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Header */}
      <header className="site-header">
        <div
          className="layout-container"
          style={{
            height: '4.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BrandLogo variant="compact" onClick={() => setActiveTab('landing')} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
              <span className="badge badge-neutral">GovStack India</span>
              <span className="badge badge-success">DPDP Act 2023 Compliant</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>support_agent</span>
            <span>Helpdesk: <strong>1800-11-2026</strong></span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '3rem 0' }}>
        <div className="layout-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '3rem',
              alignItems: 'center',
              maxWidth: '1080px',
              margin: '0 auto'
            }}
          >
            {/* Left Column: Trust & Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-info">
                  National Skilling &amp; Placement Portal
                </span>
              </div>

              <div>
                <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
                  One Gateway for Verified Talent &amp; Careers
                </h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Direct integration with <strong>National Academic Depository (NAD), Academic Bank of Credits (ABC), and AICTE</strong>. Instant proctored competency scores without resume friction.
                </p>
              </div>

              {/* Trust Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {trustCards.map((c) => (
                  <div
                    key={c.title}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--secondary)',
                        flexShrink: 0
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {c.icon}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        {c.title}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {c.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Partners */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Sanctioned &amp; Integrated With
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Ministry of Education', 'AICTE', 'NPTEL', 'MSDE', 'NAD', 'NCrF'].map((org) => (
                    <span key={org} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Authentication Form Card */}
            <div className="card" style={{ padding: '2rem 2.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {headerTitle}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {headerSubtitle}
                  </p>
                </div>
                {authStep === 'credentials' && (
                  <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                    {['login', 'signup', 'organization-signup'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => switchMode(option)}
                        className={mode === option ? 'btn btn-secondary btn-sm' : 'btn btn-outline btn-sm'}
                        style={{ border: 'none', padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                      >
                        {option === 'login' ? 'Log In' : option === 'signup' ? 'Sign Up' : 'Register Institution'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline error toast */}
              {error && (
                <div
                  role="alert"
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-bg, #FEF2F2)',
                    border: '1px solid var(--danger-border, #FCA5A5)',
                    color: 'var(--danger, #B91C1C)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    gap: '0.6rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* OTP-step banner: surface devOtp hint so testers can complete login */}
              {authStep === 'otp-verify' && devOtpHint && (
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--warning-bg, #FFFBEB)',
                    border: '1px solid var(--warning-border, #FDE68A)',
                    color: 'var(--warning, #B45309)',
                    fontSize: '0.78rem'
                  }}
                >
                  <strong>Dev OTP:</strong> {devOtpHint} <span style={{ opacity: 0.7 }}>(OTP_DEBUG_ECHO is on)</span>
                </div>
              )}

              {mode === 'login' && (
                <>
                  {authStep === 'credentials' && (
                    <>
                      <div>
                        <label htmlFor="login-role" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Continue as</label>
                        <select id="login-role" value={loginRole} onChange={(e) => setLoginRole(e.target.value)} className="input-field">
                          <option value="student">Student</option>
                          <option value="trainee">Trainee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {/* Login with Google — redirects to backend OAuth */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ padding: '0.65rem', fontSize: '0.8rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4285F4' }}>account_circle</span>
                        <span>Login with Google</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>or with credentials</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                      </div>

                      {loginRole !== 'admin' && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {[
                            { id: 'phone', label: 'Mobile Number' },
                            { id: 'email', label: 'Email Address' }
                          ].map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => switchInputMethod(method.id)}
                              className={inputMethod === method.id ? 'btn btn-navy btn-sm' : 'btn btn-secondary btn-sm'}
                              style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              {method.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {authStep === 'otp-verify' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('credentials');
                        setOtp('');
                        resetErrors();
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                      Use a different number
                    </button>
                  )}
                </>
              )}

              {/* Form Input */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {mode === 'organization-signup' ? (
                  <>
                    <div>
                      <label htmlFor="organization-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>University / Government Programme Name</label>
                      <input id="organization-name" type="text" placeholder="Institution or programme name" value={signupData.organizationName} onChange={(e) => updateSignupData('organizationName', e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label htmlFor="organization-type" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Institution Type</label>
                      <select id="organization-type" value={signupData.organizationType} onChange={(e) => updateSignupData('organizationType', e.target.value)} className="input-field">
                        <option value="university">University / Placement Cell</option>
                        <option value="government">Government Training Programme</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-join-code" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                        {signupData.organizationType === 'university' ? 'University Join Code' : 'Training Program Code'}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem' }}>(share with your students / trainees)</span>
                      </label>
                      <input
                        id="custom-join-code"
                        type="text"
                        placeholder={signupData.organizationType === 'university' ? 'e.g. NIT-CSE-2026 (leave blank to auto-generate)' : 'e.g. PMKVY-CLOUD-01 (leave blank to auto-generate)'}
                        value={signupData.customJoinCode}
                        onChange={(e) => updateSignupData('customJoinCode', e.target.value.toUpperCase())}
                        className="input-field"
                        style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                      />
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Students / trainees use this code to verify their affiliation at sign-up. Must be globally unique.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="signup-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Administrator Name</label>
                      <input id="signup-name" type="text" placeholder="Administrator full name" value={signupData.name} onChange={(e) => updateSignupData('name', e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label htmlFor="signup-email" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Administrator Email</label>
                      <input id="signup-email" type="email" placeholder="admin@example.org" value={signupData.email} onChange={(e) => updateSignupData('email', e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label htmlFor="signup-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                      <input id="signup-password" type="password" placeholder="At least 8 characters" value={signupData.password} onChange={(e) => updateSignupData('password', e.target.value)} className="input-field" required minLength={8} />
                    </div>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <div>
                      <label htmlFor="signup-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                      <input id="signup-name" type="text" placeholder="Your full name" value={signupData.name} onChange={(e) => updateSignupData('name', e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label htmlFor="signup-email" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                      <input id="signup-email" type="email" placeholder="you@example.com" value={signupData.email} onChange={(e) => updateSignupData('email', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="signup-phone" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Mobile Number</label>
                      <input id="signup-phone" type="tel" placeholder="+91 98765 43210" value={signupData.phone} onChange={(e) => updateSignupData('phone', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="signup-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                      <input id="signup-password" type="password" placeholder="At least 8 characters" value={signupData.password} onChange={(e) => updateSignupData('password', e.target.value)} className="input-field" required minLength={8} />
                    </div>
                    <div>
                      <label htmlFor="signup-account-type" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>Account Type</label>
                      <select id="signup-account-type" value={signupData.accountType} onChange={(e) => updateSignupData('accountType', e.target.value)} className="input-field">
                        <option value="student">University Student</option>
                        <option value="trainee">Government Trainee</option>
                      </select>
                    </div>

                    {/* University Student: enter university join code */}
                    {signupData.accountType === 'student' && (
                      <div>
                        <label htmlFor="organization-code" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                          University Code
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem' }}>(provided by your placement office)</span>
                        </label>
                        <input id="organization-code" type="text" placeholder="e.g. NIT-CSE-2026" value={signupData.organizationCode} onChange={(e) => updateSignupData('organizationCode', e.target.value)} className="input-field" />
                      </div>
                    )}

                    {/* Government Trainee: enter training program code */}
                    {signupData.accountType === 'trainee' && (
                      <div>
                        <label htmlFor="program-code" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                          Training Program Code
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.35rem' }}>(provided by your training administrator)</span>
                        </label>
                        <input id="program-code" type="text" placeholder="e.g. PMKVY-CLOUD-01" value={signupData.programCode} onChange={(e) => updateSignupData('programCode', e.target.value)} className="input-field" />
                      </div>
                    )}

                    {/* Academic & Career Details — powers the AI recommendations */}
                    <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                        Profile details — powers your AI recommendations
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        The more you tell us, the better we can match you with jobs and courses. All fields optional.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          Degree
                          <input type="text" placeholder="B.Tech CSE" value={signupData.degree} onChange={(e) => updateSignupData('degree', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          Branch
                          <input type="text" placeholder="Computer Science" value={signupData.branch} onChange={(e) => updateSignupData('branch', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          Institution
                          <input type="text" placeholder="NIT Trichy" value={signupData.institution} onChange={(e) => updateSignupData('institution', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          Academic Year
                          <input type="text" placeholder="Final Year (2022-2026)" value={signupData.academicYear} onChange={(e) => updateSignupData('academicYear', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          Roll Number
                          <input type="text" placeholder="22CS084" value={signupData.rollNo} onChange={(e) => updateSignupData('rollNo', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)' }}>
                          CGPA (out of 10)
                          <input type="number" step="0.01" min="0" max="10" placeholder="8.5" value={signupData.cgpa} onChange={(e) => updateSignupData('cgpa', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                        </label>
                      </div>

                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginTop: '0.65rem' }}>
                        Years of Experience (if any)
                        <input type="number" min="0" max="40" placeholder="0" value={signupData.experienceYears} onChange={(e) => updateSignupData('experienceYears', e.target.value)} className="input-field" style={{ marginTop: '0.2rem', width: '120px' }} />
                      </label>

                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginTop: '0.65rem' }}>
                        Skills you already have <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span>
                        <input type="text" placeholder="React.js, Python, SQL, Docker" value={signupData.selfReportedSkills} onChange={(e) => updateSignupData('selfReportedSkills', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                      </label>

                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginTop: '0.65rem' }}>
                        Courses you&apos;ve already completed <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span>
                        <input type="text" placeholder="NPTEL DBMS, Coursera ML, SWAYAM Cloud" value={signupData.priorCourses} onChange={(e) => updateSignupData('priorCourses', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                      </label>

                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginTop: '0.65rem' }}>
                        Preferred job locations <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(comma-separated)</span>
                        <input type="text" placeholder="Bengaluru, Hyderabad, Remote" value={signupData.preferredJobLocations} onChange={(e) => updateSignupData('preferredJobLocations', e.target.value)} className="input-field" style={{ marginTop: '0.2rem' }} />
                      </label>
                    </div>
                  </>
                ) : authStep === 'otp-verify' ? (
                  <div>
                    <label htmlFor="otp-input" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                      6-digit OTP
                    </label>
                    <input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field"
                      style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}
                      required
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="login-identifier" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                        {loginRole === 'admin'
                          ? 'Admin email or phone'
                          : inputMethod === 'phone'
                          ? 'Enter 10-digit Mobile Number'
                          : 'Enter University / College Email (.edu.in)'}
                      </label>
                      <input
                        id="login-identifier"
                        type={inputMethod === 'email' || loginRole === 'admin' ? 'text' : 'tel'}
                        placeholder={loginRole === 'admin' ? 'admin@institution.edu.in' : inputMethod === 'phone' ? '+91 98765 43210' : 'student@nit.edu.in'}
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        className="input-field"
                        required
                      />
                    </div>

                    {/* Password field — admins always; email users optionally */}
                    {(loginRole === 'admin' || inputMethod === 'email') && (
                      <div>
                        <label htmlFor="login-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.35rem' }}>
                          Password
                        </label>
                        <input
                          id="login-password"
                          type="password"
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-field"
                          required={loginRole === 'admin'}
                        />
                      </div>
                    )}

                    {/* Hint for phone-flow users */}
                    {loginRole !== 'admin' && inputMethod === 'phone' && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.25rem' }}>
                        We&apos;ll send a one-time passcode to this number. To sign in with a password instead, switch to email above.
                      </p>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--secondary)' }}
                    required
                  />
                  <label htmlFor="consent" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    I authorize Skill-Setu to verify academic credentials and issue verifiable records under the National Credit Framework (NCrF).
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !consentAccepted}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <span>{loading ? 'Please wait…' : submitLabel}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </form>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                Need assistance? Contact your institute&apos;s Training &amp; Placement Office (TPO).
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: '#FFFFFF', padding: '1.25rem 0' }}>
        <div className="layout-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-light)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>&copy; 2026 <strong>Skill-Setu (Skill-सेतु)</strong>. AICTE Sovereign Education Rail.</span>
          <button
            onClick={() => setActiveTab('landing')}
            style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            &larr; Back to Overview
          </button>
        </div>
      </footer>
    </div>
  );
}
