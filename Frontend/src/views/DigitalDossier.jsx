import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function DigitalDossier() {
  const { profile, updateProfile, updateSettings, showToast, fetchAllRoles, fetchTargetRoles } = useApp();
  const [showQrModal, setShowQrModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [catalogRoles, setCatalogRoles] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Local form state synced from the server-backed profile once available.
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    phone: '',
    selfReportedSkills: '',
    preferredJobLocations: '',
    targetRoleIds: [],
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
        selfReportedSkills: (profile.selfReportedSkills || []).join(', '),
        preferredJobLocations: (profile.preferredJobLocations || []).join(', '),
        targetRoleIds: (profile.targetRoleIds || []).map((r) => (typeof r === 'object' && r ? r.id || r._id : r)),
        recruiterVisibility: profile.settings?.recruiterVisibility ?? true,
        emailAlerts: profile.settings?.emailAlerts ?? true,
        smsAlerts: profile.settings?.smsAlerts ?? false
      });
    }
  }, [profile]);

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

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const commaSeparatedValues = (value) => [...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )];

    // Persist editable profile fields + settings to the backend.
    const updatedProfile = await updateProfile({
      name: formData.name,
      rollNo: formData.rollNo,
      email: formData.email,
      phone: formData.phone,
      selfReportedSkills: commaSeparatedValues(formData.selfReportedSkills),
      preferredJobLocations: commaSeparatedValues(formData.preferredJobLocations),
      targetRoleIds: formData.targetRoleIds || []
    });
    if (!updatedProfile) return;

    await updateSettings({
      recruiterVisibility: formData.recruiterVisibility,
      emailAlerts: formData.emailAlerts,
      smsAlerts: formData.smsAlerts
    });

    await fetchTargetRoles();
    setIsEditingProfile(false);
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
              style={{
                width: '84px',
                height: '104px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                background: 'var(--surface-subtle)'
              }}
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
                padding: '3px',
                cursor: 'pointer'
              }}
              title="Click to view QR"
            >
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <rect x="0" y="0" width="30" height="30" fill="#102A43" />
                <rect x="5" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="10" width="10" height="10" fill="#102A43" />

                <rect x="70" y="0" width="30" height="30" fill="#102A43" />
                <rect x="75" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="80" y="10" width="10" height="10" fill="#102A43" />

                <rect x="0" y="70" width="30" height="30" fill="#102A43" />
                <rect x="5" y="75" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="80" width="10" height="10" fill="#102A43" />

                <rect x="40" y="10" width="15" height="15" fill="#D9822B" />
                <rect x="40" y="40" width="20" height="20" fill="#102A43" />
                <rect x="70" y="40" width="10" height="20" fill="#102A43" />
                <rect x="40" y="70" width="20" height="15" fill="#1976A8" />
                <rect x="70" y="70" width="20" height="20" fill="#102A43" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile((isEditing) => !isEditing)}
            className="btn btn-outline btn-sm"
            style={{ width: '100%' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{isEditingProfile ? 'close' : 'edit'}</span>
            {isEditingProfile ? 'Close Edit Profile' : 'Edit Profile'}
          </button>
        </div>

        {/* Right: Current employment status */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Current Career Status
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                A live snapshot of {profile.name ? profile.name.split(' ')[0] : 'the candidate'}'s employment journey
              </p>
            </div>
            <span className="badge badge-info">Updated today</span>
          </div>

          <div style={{ padding: '1rem 1.1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{profile.employmentStatus || 'Open to Work'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>{profile.employmentSummary || ''}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Experience', value: profile.experienceYears ? `${profile.experienceYears} years` : 'Fresher' },
              { label: 'Current role', value: profile.currentRole || 'Seeking first role' },
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
        </div>
      </div>

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

      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>person</span>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Personal Identity</h2>
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
                Self-Reported Skills
                <input type="text" value={formData.selfReportedSkills} onChange={(event) => setFormData({ ...formData, selfReportedSkills: event.target.value })} placeholder="React, Python, SQL" className="input-field" />
                <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)' }}>Separate multiple skills with commas.</span>
              </label>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>
                Preferred Job Locations
                <input type="text" value={formData.preferredJobLocations} onChange={(event) => setFormData({ ...formData, preferredJobLocations: event.target.value })} placeholder="Bengaluru, Hyderabad, Remote" className="input-field" />
                <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)' }}>Separate multiple locations with commas.</span>
              </label>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

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
                width: '160px',
                height: '160px',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: '#FFFFFF'
              }}
            >
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <rect x="0" y="0" width="30" height="30" fill="#102A43" />
                <rect x="5" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="10" width="10" height="10" fill="#102A43" />

                <rect x="70" y="0" width="30" height="30" fill="#102A43" />
                <rect x="75" y="5" width="20" height="20" fill="#FFFFFF" />
                <rect x="80" y="10" width="10" height="10" fill="#102A43" />

                <rect x="0" y="70" width="30" height="30" fill="#102A43" />
                <rect x="5" y="75" width="20" height="20" fill="#FFFFFF" />
                <rect x="10" y="80" width="10" height="10" fill="#102A43" />

                <rect x="40" y="10" width="15" height="15" fill="#D9822B" />
                <rect x="40" y="40" width="20" height="20" fill="#102A43" />
                <rect x="70" y="40" width="10" height="20" fill="#102A43" />
                <rect x="40" y="70" width="20" height="15" fill="#1976A8" />
                <rect x="70" y="70" width="20" height="20" fill="#102A43" />
              </svg>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
              &check; Digitally Signed Credential
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
