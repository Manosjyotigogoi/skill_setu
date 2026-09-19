import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export default function JobMatching() {
  const { campusDrives, applyForDrive, activeJobModal, setActiveJobModal, profile, discoverJobs, userRole, analyzeSkillGap } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [minMatch, setMinMatch] = useState(0);

  // AI-discovered jobs (the primary source — replaces seeded drives as the
  // main listing). Loaded automatically on first mount.
  const [aiJobs, setAiJobs] = useState([]);
  const [aiInsight, setAiInsight] = useState('');
  const [providerError, setProviderError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [location, setLocation] = useState('');

  // AI Skill Gap Analysis Modal
  const [skillGapModal, setSkillGapModal] = useState(null);


  const fmtDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Load AI jobs on mount using the user's preferred location (or 'India' default)
  const loadAiJobs = useCallback(async (loc) => {
    setAiLoading(true);
    setAiError(null);
    const result = await discoverJobs(loc || location || profile?.preferredJobLocations?.[0] || 'India');
    if (result.error) {
      setAiError(result.error);
    } else {
      setAiJobs(result.jobs || []);
      setAiInsight(result.insight || '');
      setProviderError(result.providerError || '');
    }
    setAiLoading(false);
  }, [discoverJobs, location, profile]);

  useEffect(() => {
    loadAiJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunAiSkillGap = async (title, reqSkills) => {
    setSkillGapModal({ title, loading: true, data: null });
    const skillsList = Array.isArray(reqSkills) ? reqSkills : [];
    const res = await analyzeSkillGap({
      targetRole: title,
      requiredSkills: skillsList
    });
    if (res && res.analysis) {
      setSkillGapModal({ title, loading: false, data: res.analysis });
    } else {
      setSkillGapModal((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };


  // Filter campus drives by search query (the secondary "Campus Drives" section)
  const filteredDrives = (campusDrives || []).filter((drive) => {
    const matchesQuery =
      !searchQuery ||
      (drive.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (drive.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (drive.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore = (drive.matchPercentage || 0) >= minMatch;
    return matchesQuery && matchesScore;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-warning">AI-Powered Job Discovery</span>
          <span className="badge badge-info">{aiJobs.length + (campusDrives?.length || 0)} Opportunities</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '750px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
              Job Opportunities
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              AI searches live job postings matching your verified skills and self-reported skills.
              Opportunities are matched against your academic CGPA ({profile?.cgpa ?? '—'}) and employment readiness ({profile?.readinessScore ?? 0}%).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Location
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={profile?.preferredJobLocations?.[0] || 'India'}
                className="input-field"
                style={{ width: '160px', padding: '0.4rem 0.6rem' }}
              />
            </label>
            <button
              onClick={() => loadAiJobs(location)}
              disabled={aiLoading}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.55rem 1rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: aiLoading ? 'spin 1s linear infinite' : 'none' }}>search</span>
              {aiLoading ? 'Searching…' : 'Refresh AI Jobs'}
            </button>
          </div>
        </div>
      </section>

      {/* AI insight banner */}
      {aiInsight && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start', background: 'var(--secondary-tint)', borderColor: 'var(--secondary)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--secondary)' }}>auto_awesome</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>AI Market Insight</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>{aiInsight}</p>
          </div>
        </div>
      )}

      {aiError && (
        <div className="card" style={{ padding: '1rem 1.25rem', borderColor: 'var(--danger, #FCA5A5)', color: 'var(--danger, #B91C1C)', fontSize: '0.85rem' }}>
          {aiError}
        </div>
      )}

      {/* AI-Discovered Jobs (primary) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Live Adzuna Job Postings</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Real market openings from Adzuna matched dynamically against your verified and self-reported skills.</p>
          </div>
          {aiLoading && <span className="badge badge-info">Searching Adzuna…</span>}
        </div>

        {providerError && (
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', borderColor: 'var(--border-subtle)', background: 'var(--surface-subtle)', color: 'var(--text-body)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>info</span>
            <div>
              <strong>Live Job Provider Notice:</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', lineHeight: 1.5 }}>{providerError}</p>
            </div>
          </div>
        )}

        {!aiLoading && aiJobs.length === 0 && !aiError && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No live Adzuna jobs found for your skills. Add more skills to your profile or configure Adzuna API credentials in backend/.env.
          </div>
        )}


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1rem' }}>
          {aiJobs.map((job) => (
            <a key={job.id || job.url} href={job.url} target="_blank" rel="noopener noreferrer" className="card" style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>{job.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{job.company}</div>
                </div>
                <span className={`badge ${job.isFallback ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>{job.isFallback ? 'Search link' : job.source}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{job.location || 'Location not listed'}</span>
                <span>{job.employmentType || 'Type not specified'}</span>
                {job.salary && <span>{job.salary}</span>}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1, margin: 0 }}>{job.description || 'No description provided.'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{job.matchPercentage ?? 0}% Match</span>
                {(job.matchedSkills || []).map((skill) => <span key={`match-${skill}`} className="badge badge-success" style={{ fontSize: '0.68rem' }}>✓ {skill}</span>)}
                {(job.missingSkills || []).map((skill) => <span key={`missing-${skill}`} className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Gap: {skill}</span>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{job.postedDate ? `Posted ${fmtDate(job.postedDate)}` : 'Date not listed'} · {job.source}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRunAiSkillGap(job.title, (job.matchedSkills || []).concat(job.missingSkills || []));
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Run Gemini AI Skill Gap Analysis"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>auto_awesome</span>
                    AI Skill Gap
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 600 }}>Apply ↗</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>


      {/* Campus Drives (secondary — institutional placements managed by admin) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Campus Placement Drives</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Verified institutional drives with direct application via your Skill-Setu dossier.</p>
          </div>
          <span className="badge badge-info">{filteredDrives.length} active</span>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>search</span>
            <input
              type="text"
              placeholder="Search by company, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ border: 'none', padding: '0.35rem 0', boxShadow: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Minimum Alignment:</span>
            <select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className="input-field" style={{ width: 'auto', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>
              <option value={0}>Any Match</option>
              <option value={60}>60%+ Match</option>
              <option value={70}>70%+ Match</option>
              <option value={80}>80%+ Match</option>
              <option value={90}>90%+ Match</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredDrives.map((drive) => (
            <div key={drive.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                      {drive.logoInitials}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>{drive.company}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{drive.location}</p>
                    </div>
                  </div>
                  <span className="badge" style={{ background: drive.matchPercentage >= 90 ? 'var(--success-bg)' : 'var(--warning-bg)', color: drive.matchPercentage >= 90 ? 'var(--success)' : 'var(--warning)', border: `1px solid ${drive.matchPercentage >= 90 ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                    {drive.matchPercentage}% Match
                  </span>
                </div>
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-main)' }}>{drive.role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--saffron)' }}>{drive.ctc}</span>
                    <span style={{ color: 'var(--text-light)' }}>&bull;</span>
                    <span style={{ color: 'var(--text-muted)' }}>Min CGPA: {drive.eligibilityCgpa}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Skills Requirement</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {drive.matchedSkills.map((sk, i) => (
                      <span key={i} className="badge badge-info" style={{ fontSize: '0.72rem' }}>✓ {sk}</span>
                    ))}
                    {drive.missingSkills.map((sk, i) => (
                      <span key={`miss-${i}`} className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Gap: {sk}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interview scheduled notice if drive is applied and has an interview date */}
              {drive.applied && drive.interviewDate && (
                <div style={{ padding: '0.65rem 0.85rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#059669' }}>event_available</span>
                  <div style={{ fontSize: '0.8rem', color: '#065F46', lineHeight: 1.3 }}>
                    <div>Interview Date: <strong>{fmtDate(drive.interviewDate)}</strong></div>
                    <small style={{ color: '#047857' }}>Status: {drive.appStatus || 'Interview Scheduled'}</small>
                  </div>
                </div>
              )}

              <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deadline: <strong>{fmtDate(drive.deadline)}</strong></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleRunAiSkillGap(drive.role, (drive.matchedSkills || []).concat(drive.missingSkills || []))}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    title="Analyze skill gap against this campus drive with Gemini"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>auto_awesome</span>
                    AI Skill Gap
                  </button>
                  {drive.applied ? (
                    <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>
                      {drive.interviewDate ? 'Interview Scheduled' : 'Applied'}
                    </span>
                  ) : (
                    <button onClick={() => setActiveJobModal(drive)} className="btn btn-primary btn-sm">Apply Now</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application Modal */}
      {activeJobModal && (
        <div className="civic-modal-backdrop" onClick={() => setActiveJobModal(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {activeJobModal.logoInitials}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Apply to {activeJobModal.company}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeJobModal.role} &bull; {activeJobModal.ctc}</p>
                </div>
              </div>
              <button onClick={() => setActiveJobModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Application Credentials</div>
              <div style={{ color: 'var(--text-body)' }}>Candidate: <strong>{profile?.name || '—'}</strong> ({profile?.rollNo || '—'})</div>
              <div style={{ color: 'var(--text-muted)' }}>AICTE ID: {profile?.aicteId || '—'} &bull; CGPA: {profile?.cgpa ?? '—'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Verified Skills: <strong>{profile?.verifiedSkillsCount ?? 0} Competencies Attached</strong></div>
              <div style={{ color: 'var(--success)', fontWeight: 600, marginTop: '0.25rem' }}>✓ Verified academic credentials will be submitted directly to recruiter portal.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setActiveJobModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={() => { applyForDrive(activeJobModal.id); setActiveJobModal(null); }} className="btn btn-primary btn-sm">Submit Application</button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Skill Gap Analysis Modal */}
      {skillGapModal && (
        <div className="civic-modal-backdrop" onClick={() => setSkillGapModal(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>auto_awesome</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    AI Skill Gap Analysis
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{skillGapModal.title}</p>
                </div>
              </div>
              <button onClick={() => setSkillGapModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {skillGapModal.loading ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite', color: 'var(--secondary)', display: 'block', margin: '0 auto 0.75rem' }}>progress_activity</span>
                Gemini AI is analyzing your verified &amp; self-reported competencies against this role…
              </div>
            ) : skillGapModal.data ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Match alignment score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>Overall Role Alignment</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calculated against your Skill-Setu verified credentials</div>
                  </div>
                  <span className="badge" style={{ fontSize: '0.95rem', padding: '0.4rem 0.85rem', fontWeight: 800, background: (skillGapModal.data.matchPercentage || 0) >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)', color: (skillGapModal.data.matchPercentage || 0) >= 70 ? 'var(--success)' : 'var(--warning)', border: `1px solid ${(skillGapModal.data.matchPercentage || 0) >= 70 ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                    {skillGapModal.data.matchPercentage ?? 0}% Match
                  </span>
                </div>

                {/* Matched skills */}
                {skillGapModal.data.matchedSkills && skillGapModal.data.matchedSkills.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Strengths Verified</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {skillGapModal.data.matchedSkills.map((sk) => (
                        <span key={sk} className="badge badge-success">✓ {sk}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Gaps with severity & reasoning */}
                {skillGapModal.data.skillGaps && skillGapModal.data.skillGaps.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Identified Skill Gaps</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {skillGapModal.data.skillGaps.map((gap, i) => (
                        <div key={i} style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{gap.skill || gap}</strong>
                            {gap.severity && (
                              <span className={`badge ${gap.severity === 'CRITICAL' ? 'badge-danger' : gap.severity === 'MODERATE' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                                {gap.severity}
                              </span>
                            )}
                          </div>
                          {gap.reasoning && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{gap.reasoning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning Roadmap */}
                {skillGapModal.data.learningRoadmap && skillGapModal.data.learningRoadmap.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>AI Actionable Roadmap</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
                      {skillGapModal.data.learningRoadmap.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Free Courses from MongoDB */}
                {skillGapModal.data.recommendedCourses && skillGapModal.data.recommendedCourses.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Recommended Free Learning Resources (MongoDB)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {skillGapModal.data.recommendedCourses.slice(0, 3).map((c, i) => (
                        <div key={i} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#FFFFFF', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{c.provider}</span>
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{c.freeStatus || '100% Free'}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>{c.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.duration} {c.level ? `• ${c.level}` : ''}</div>
                          </div>
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ flexShrink: 0, textDecoration: 'none', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
                              Open Course ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Could not retrieve skill gap data. Please check connection and try again.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={() => setSkillGapModal(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

