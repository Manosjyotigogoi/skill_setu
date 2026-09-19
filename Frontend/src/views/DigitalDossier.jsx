import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

const POPULAR_SKILLS = [
  'Python',
  'JavaScript',
  'React.js',
  'Node.js',
  'TypeScript',
  'SQL',
  'Data Structures & Algorithms',
  'Java',
  'Docker',
  'Git & GitHub',
  'AWS Cloud',
  'Machine Learning',
  'REST APIs',
  'Tailwind CSS',
  'MongoDB',
  'Cybersecurity',
  'C++',
  'System Design',
  'GraphQL',
  'Next.js'
];

export default function DigitalDossier() {
  const {
    profile,
    updateProfile,
    updateSettings,
    showToast,
    fetchAllRoles,
    fetchTargetRoles,
    uploadAvatar,
    deleteAvatar,
    isUploadingAvatar
  } = useApp();
  const [showQrModal, setShowQrModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingCareerStatus, setIsEditingCareerStatus] = useState(false);
  const [isSavingCareerStatus, setIsSavingCareerStatus] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [catalogRoles, setCatalogRoles] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const avatarInputRef = useRef(null);

  // Target URL encoded by the profile QR code. Reads QR_PLACEHOLDER_URL from .env
  // (designed to easily transition to individual user profile URLs in the future).
  const qrTargetUrl =
    profile?.qrTargetUrl ||
    import.meta.env.QR_PLACEHOLDER_URL ||
    import.meta.env.VITE_QR_PLACEHOLDER_URL ||
    'https://www.youtube.com/';

  useEffect(() => {
    if (!qrTargetUrl) return;
    QRCode.toDataURL(qrTargetUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#102A43',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [qrTargetUrl]);

  // Local form state synced from the server-backed profile once available.
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    phone: '',
    selfReportedSkills: [],
    preferredJobLocations: '',
    targetRoleIds: [],
    employmentStatus: 'Open to Work',
    employmentSummary: '',
    currentCompany: '',
    currentRole: '',
    currentPackage: '',
    experienceYears: 0,
    recruiterVisibility: true,
    emailAlerts: true,
    smsAlerts: false
  });

  useEffect(() => {
    setLoadingCatalog(true);
    fetchAllRoles().then((roles) => {
      setCatalogRoles(roles || []);
      setLoadingCatalog(false);
    });
  }, [fetchAllRoles]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        rollNo: profile.rollNo || '',
        email: profile.email || '',
        phone: profile.phone || '',
        selfReportedSkills: Array.isArray(profile.selfReportedSkills)
          ? [...profile.selfReportedSkills]
          : typeof profile.selfReportedSkills === 'string' && profile.selfReportedSkills.trim()
            ? profile.selfReportedSkills.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        preferredJobLocations: (profile.preferredJobLocations || []).join(', '),
        targetRoleIds: (profile.targetRoleIds || []).map((r) => (typeof r === 'object' && r ? r.id || r._id : r)),
        employmentStatus: profile.employmentStatus || 'Open to Work',
        employmentSummary: profile.employmentSummary || '',
        currentCompany: profile.currentCompany || '',
        currentRole: profile.currentRole || '',
        currentPackage: profile.currentPackage || '',
        experienceYears: profile.experienceYears ?? 0,
        recruiterVisibility: profile.settings?.recruiterVisibility ?? true,
        emailAlerts: profile.settings?.emailAlerts ?? true,
        smsAlerts: profile.settings?.smsAlerts ?? false
      });
    }
  }, [profile]);

  const handleAddSkill = (skillToAdd) => {
    const raw = typeof skillToAdd === 'string' ? skillToAdd : skillInput;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (trimmed.length > 100) {
      showToast('Skill name must be at most 100 characters.', 'error');
      return;
    }

    const currentSkills = Array.isArray(formData.selfReportedSkills)
      ? formData.selfReportedSkills
      : [];

    if (currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`"${trimmed}" is already added.`, 'info');
      setSkillInput('');
      return;
    }

    if (currentSkills.length >= 50) {
      showToast('You can declare up to 50 skills maximum.', 'error');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      selfReportedSkills: [...(Array.isArray(prev.selfReportedSkills) ? prev.selfReportedSkills : []), trimmed]
    }));
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      selfReportedSkills: (Array.isArray(prev.selfReportedSkills) ? prev.selfReportedSkills : []).filter(
        (s) => s !== skillToRemove
      )
    }));
  };

  const handleToggleRole = (roleId) => {
    setFormData((prev) => {
      const current = prev.targetRoleIds || [];
      const next = current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId];
      return { ...prev, targetRoleIds: next };
    });
  };

  const handleExportPdf = async () => {
    showToast('Generating official Skill-Setu PDF Dossier…', 'info');
    try {
      const { signature, issuedAt } = await api.get('/dossier/me');
      showToast(
        `Dossier regenerated. Signed at ${new Date(issuedAt).toLocaleString()}.`,
        'success'
      );
      // Optionally could download as a JSON proof here in the future.
      // eslint-disable-next-line no-console
      console.info('Dossier signature:', signature);
    } catch {
      showToast('Could not generate dossier.', 'error');
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP, GIF).', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB.', 'error');
      event.target.value = '';
      return;
    }

    await uploadAvatar(file);
    event.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      await deleteAvatar();
    }
  };

  const handleSaveCareerStatus = async (event) => {
    if (event) event.preventDefault();
    setIsSavingCareerStatus(true);
    try {
      const updated = await updateProfile({
        employmentStatus: formData.employmentStatus,
        employmentSummary: formData.employmentSummary,
        currentCompany: formData.currentCompany,
        currentRole: formData.currentRole,
        currentPackage: formData.currentPackage,
        experienceYears: Number(formData.experienceYears) || 0
      });
      if (updated) {
        setIsEditingCareerStatus(false);
      }
    } finally {
      setIsSavingCareerStatus(false);
    }
  };

  const handleSaveProfile = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    setIsSavingProfile(true);
    try {
      const commaSeparatedValues = (value) => [...new Set(
        String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )];

      const cleanedSkills = (Array.isArray(formData.selfReportedSkills)
        ? formData.selfReportedSkills
        : commaSeparatedValues(formData.selfReportedSkills)
      )
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

      // Persist editable profile fields + settings to the backend.
      const updatedProfile = await updateProfile({
        name: formData.name,
        rollNo: formData.rollNo,
        email: formData.email,
        phone: formData.phone,
        selfReportedSkills: [...new Set(cleanedSkills)],
        preferredJobLocations: commaSeparatedValues(formData.preferredJobLocations),
        targetRoleIds: formData.targetRoleIds || [],
        employmentStatus: formData.employmentStatus,
        employmentSummary: formData.employmentSummary,
        currentCompany: formData.currentCompany,
        currentRole: formData.currentRole,
        currentPackage: formData.currentPackage,
        experienceYears: Number(formData.experienceYears) || 0
      });
      if (!updatedProfile) return;

      await updateSettings({
        recruiterVisibility: formData.recruiterVisibility,
        emailAlerts: formData.emailAlerts,
        smsAlerts: formData.smsAlerts
      });

      await fetchTargetRoles();
      setIsEditingProfile(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // While profile is loading after login, render a friendly placeholder.
  if (!profile) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading your profile…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">
            National Skill Identity
          </span>
          <span className="badge badge-success">
            National Registry &amp; NAD Interoperable
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '750px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
              Profile &amp; Verified Documents
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Keep your SkillSetu ID, verified documents, and employment-ready skill credentials in one profile.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setShowQrModal(true)}
              className="btn btn-secondary btn-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code</span>
              <span>Verification QR</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              <span>Regenerate Dossier</span>
            </button>
          </div>
        </div>
      </section>

      {/* Grid: ID Card & Current Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left: Skill Passport Card */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            border: '2px solid var(--border-medium)'
          }}
        >
          {/* Card Top Branding */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
            <BrandLogo variant="compact" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Republic of India
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Ministry of Skill Development &amp; AICTE
              </div>
            </div>
          </div>

          {/* Photo and Details */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div
              onClick={() => setIsEditingProfile(true)}
              style={{
                width: '84px',
                height: '104px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                background: 'var(--surface-subtle)',
                cursor: 'pointer'
              }}
              title="Click to edit profile photo"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>person</span>
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '2px 0'
                }}
              >
                VERIFIED
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {profile.name}
                </h3>
                {profile.hindiName && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                    {profile.hindiName}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginTop: '0.25rem' }}>
                <strong>{profile.degree || 'Degree on file'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {profile.institution || 'Registered institution'}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                {profile.rollNo && (
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                    Roll: {profile.rollNo}
                  </span>
                )}
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                  CGPA: {profile.cgpa ?? '—'}
                </span>
                {profile.nsqfLevel && (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {profile.nsqfLevel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* QR Code and Identifiers */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SkillSetu ID</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {profile.skillSetuId || profile.aicteId || '—'}
              </div>
              {profile.regId && (
                <>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>National Reg / ABC ID</div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    {profile.regId}
                  </div>
                </>
              )}
            </div>

            <div
              onClick={() => setShowQrModal(true)}
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
              title="Click to view Verification QR"
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="SkillSetu Verification QR"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--text-muted)' }}>
                  qr_code_2
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsEditingProfile((isEditing) => !isEditing)}
              className="btn btn-outline btn-sm"
              style={{ width: '100%' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{isEditingProfile ? 'close' : 'edit'}</span>
              {isEditingProfile ? 'Close Edit Profile' : 'Edit Profile'}
            </button>

            {isEditingProfile && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                {isSavingProfile ? 'Saving Profile…' : 'Save Profile Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Current employment status */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Current Career Status
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                A live snapshot of {profile.name ? profile.name.split(' ')[0] : 'the candidate'}'s employment journey
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-info">Live</span>
            </div>
          </div>

          {isEditingCareerStatus ? (
            <form onSubmit={handleSaveCareerStatus} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="Open to Work">Open to Work</option>
                    <option value="Employed">Employed</option>
                    <option value="Not Looking">Not Looking</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                  Career Headline / Summary
                </label>
                <input
                  type="text"
                  value={formData.employmentSummary}
                  onChange={(e) => setFormData({ ...formData, employmentSummary: e.target.value })}
                  placeholder="e.g. Actively seeking SDE-1 roles in Bengaluru / Remote"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                    Current / Target Role
                  </label>
                  <input
                    type="text"
                    value={formData.currentRole}
                    onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                    Company / Employer
                  </label>
                  <input
                    type="text"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                    placeholder="e.g. Acme Corp / Not employed"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '0.25rem' }}>
                  Annual Package (CTC)
                </label>
                <input
                  type="text"
                  value={formData.currentPackage}
                  onChange={(e) => setFormData({ ...formData, currentPackage: e.target.value })}
                  placeholder="e.g. 10 LPA or Not applicable"
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button
                  type="submit"
                  disabled={isSavingCareerStatus}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    save
                  </span>
                  {isSavingCareerStatus ? 'Saving…' : 'Save Career Status'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCareerStatus(false)}
                  disabled={isSavingCareerStatus}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ padding: '1rem 1.1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{profile.employmentStatus || 'Open to Work'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>{profile.employmentSummary || 'No career summary provided yet.'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Experience', value: profile.experienceYears ? `${profile.experienceYears} years` : 'Fresher' },
                  { label: 'Current role', value: profile.currentRole || 'Not employed' },
                  { label: 'Company', value: profile.currentCompany || 'Not employed' },
                  { label: 'Package', value: profile.currentPackage || 'Not applicable' }
                ].map((item) => (
                  <div key={item.label} style={{ padding: '0.8rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Readiness</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  {profile.readinessScore ?? 0}% national benchmark
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {profile.verifiedSkillsCount ?? 0} verified skills &bull; NSQF {profile.nsqfLevel || 'pending'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingCareerStatus(true)}
                className="btn btn-outline btn-sm"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                Edit Career Status
              </button>
            </>
          )}
        </div>
      </div>

      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>person</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Personal Identity</h2>
            </div>

            {/* Profile Picture Upload & Cloudinary Integration */}
            <div
              style={{
                padding: '1.15rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--secondary)',
                  background: '#102A43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '38px', color: '#FFFFFF' }}>
                    person
                  </span>
                )}
                {isUploadingAvatar && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: '#FFFFFF', animation: 'spin 1s linear infinite', fontSize: '24px' }}
                    >
                      progress_activity
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '180px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Profile Picture
                  </span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  PNG, JPG, or WebP up to 5MB. Centered &amp; auto-optimized for your Skill-Setu credential.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      photo_camera
                    </span>
                    {isUploadingAvatar ? 'Uploading…' : profile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>

                  {profile.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        delete
                      </span>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Full Legal Name
                <input type="text" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="input-field" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                University Roll Number
                <input type="text" value={formData.rollNo} onChange={(event) => setFormData({ ...formData, rollNo: event.target.value })} className="input-field" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Institutional Email (.edu.in)
                <input type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="input-field" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Registered Mobile
                <input type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="input-field" />
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Preferred Job Locations
                <input type="text" value={formData.preferredJobLocations} onChange={(event) => setFormData({ ...formData, preferredJobLocations: event.target.value })} placeholder="Bengaluru, Hyderabad, Remote" className="input-field" />
                <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)' }}>Separate multiple locations with commas.</span>
              </label>
            </div>
          </div>

          {/* Elaborate Self-Reported Skills Section */}
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>psychology</span>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Self-Reported Skills
                </h2>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                {(formData.selfReportedSkills || []).length} added
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
              Declare technical proficiencies, frameworks, and tools you have experience with. These enhance benchmark scoring and job matching.
            </p>

            {/* Input to add skill */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddSkill(skillInput);
                  }
                }}
                placeholder="Type skill & press Enter (e.g. Next.js, Docker)"
                className="input-field"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Add
              </button>
            </div>

            {/* Currently added skills container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)' }}>
                  Your Declared Skills
                </span>
                {(formData.selfReportedSkills || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, selfReportedSkills: [] }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  minHeight: '56px',
                  padding: '0.85rem',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center'
                }}
              >
                {(formData.selfReportedSkills || []).length > 0 ? (
                  formData.selfReportedSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.65rem 0.35rem 0.8rem',
                        borderRadius: '9999px',
                        background: 'rgba(25, 118, 168, 0.12)',
                        border: '1px solid rgba(25, 118, 168, 0.35)',
                        color: 'var(--secondary)',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        title={`Remove ${skill}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          color: 'var(--secondary)',
                          opacity: 0.7,
                          borderRadius: '50%'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                      </button>
                    </span>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', justifyContent: 'center', padding: '0.4rem 0' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                    No skills added yet. Type a skill above or click from suggestions below.
                  </div>
                )}
              </div>
            </div>

            {/* Quick-add popular suggestions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Popular &amp; In-Demand Skills (click to quick-add):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {POPULAR_SKILLS.filter(
                  (s) => !(formData.selfReportedSkills || []).some((added) => added.toLowerCase() === s.toLowerCase())
                ).map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => handleAddSkill(suggested)}
                    className="badge badge-neutral"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.74rem',
                      transition: 'all 0.15s ease',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--surface-card)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--secondary)';
                      e.currentTarget.style.color = 'var(--secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                      e.currentTarget.style.color = 'inherit';
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>add</span>
                    {suggested}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target Career Roles Picker */}
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>ads_click</span>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Target Career Roles</h2>
              </div>
              <span className="badge badge-info">{formData.targetRoleIds?.length || 0} selected</span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              Select the career paths you are targeting. These define your readiness scores, skill gap analysis, and course recommendations.
            </p>

            {loadingCatalog ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Loading role catalog…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {catalogRoles.map((role) => {
                  const isSelected = (formData.targetRoleIds || []).includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(25, 118, 168, 0.08)' : 'var(--surface-subtle)',
                        border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                          />
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{role.title}</strong>
                        </div>
                        {role.tier && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                            {role.tier}
                          </span>
                        )}
                      </div>
                      {role.requiredSkills && role.requiredSkills.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '24px' }}>
                          Key skills: {role.requiredSkills.map((s) => s.name).slice(0, 4).join(', ')}
                          {role.requiredSkills.length > 4 ? ` +${role.requiredSkills.length - 4} more` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '20px' }}>security</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Integrations &amp; Permissions</h2>
            </div>

            {[
              { key: 'recruiterVisibility', title: 'Recruiter Visibility', description: 'Allow campus recruiters to search and view your verified skills.' },
              { key: 'emailAlerts', title: 'Placement Email Alerts', description: 'Receive email alerts when new campus drives match your profile.' },
              { key: 'smsAlerts', title: 'SMS Alerts', description: 'Receive SMS notifications for placement deadlines and round shortlists.' }
            ].map((preference) => (
              <label key={preference.key} style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }}>
                <span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{preference.title}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{preference.description}</span>
                </span>
                <input type="checkbox" checked={formData[preference.key]} onChange={(event) => setFormData({ ...formData, [preference.key]: event.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)', cursor: 'pointer' }} />
              </label>
            ))}
          </div>
        </form>
      )}

      {/* Self-Reported Skills in View Mode */}
      <section className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>psychology</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Self-Reported Skills
              </h2>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
              Technical proficiencies and competencies declared by {profile.name ? profile.name.split(' ')[0] : 'the candidate'}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="btn btn-secondary btn-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Manage Skills
          </button>
        </div>

        {profile.selfReportedSkills && profile.selfReportedSkills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.selfReportedSkills.map((skill) => (
              <span
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  background: 'rgba(25, 118, 168, 0.08)',
                  border: '1px solid rgba(25, 118, 168, 0.25)',
                  color: 'var(--secondary)',
                  fontSize: '0.825rem',
                  fontWeight: 600
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px dashed var(--border-medium)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--text-muted)' }}>psychology</span>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>No self-reported skills added yet</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Add your technical skills and domain strengths to improve role recommendations and recruiter visibility.
            </p>
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.25rem' }}
            >
              Add Skills
            </button>
          </div>
        )}
      </section>

      {/* Target Roles in View Mode */}
      <section className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>ads_click</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Targeted Career Roles
              </h2>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
              Career paths configured for your readiness benchmark, skill gap analysis, and course recommendations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="btn btn-secondary btn-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Target Roles
          </button>
        </div>

        {catalogRoles.filter((r) => (profile.targetRoleIds || []).some((tr) => (typeof tr === 'object' && tr ? (tr.id || tr._id) : tr) === r.id)).length === 0 ? (
          <div style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px dashed var(--border-medium)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>track_changes</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>No Target Roles Selected</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '450px' }}>
                Select your targeted career roles to personalize your skill gap analysis and unlock tailored learning recommendations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-primary btn-sm"
            >
              Choose Target Roles
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {catalogRoles
              .filter((r) => (profile.targetRoleIds || []).some((tr) => (typeof tr === 'object' && tr ? (tr.id || tr._id) : tr) === r.id))
              .map((role) => (
                <div
                  key={role.id}
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {role.title}
                    </h3>
                    {role.tier && (
                      <span className="badge badge-info" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {role.tier}
                      </span>
                    )}
                  </div>
                  {role.targetReadiness && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>
                      Target Readiness: {role.targetReadiness}%
                    </div>
                  )}
                  {role.requiredSkills && role.requiredSkills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                      {role.requiredSkills.map((skill) => (
                        <span key={skill.name} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* QR Modal */}
      {showQrModal && (
        <div className="civic-modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '380px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <BrandLogo variant="compact" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Credential Verification QR
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Scan with an authorized employer or institution scanner to verify {profile.name}&apos;s credentials.
            </p>

            <div
              style={{
                width: '180px',
                height: '180px',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Credential Verification QR"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>
                  qr_code_2
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
              ✓ Digitally Signed Credential
            </div>

  

            <button
              onClick={() => setShowQrModal(false)}
              className="btn btn-navy btn-sm"
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
