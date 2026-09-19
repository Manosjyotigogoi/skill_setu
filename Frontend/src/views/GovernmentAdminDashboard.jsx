import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function GovernmentAdminDashboard() {
  const { showToast, triggerLogout } = useApp();

  const [activeTab, setActiveTab] = useState('programs'); // 'programs' | 'trainees' | 'placements' | 'notifications'
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [programFilter, setProgramFilter] = useState('');

  // Program Modal
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programForm, setProgramForm] = useState({
    title: '',
    programCode: '',
    provider: '',
    description: '',
    durationWeeks: 8,
    taughtSkills: '',
    techFocusAreas: ''
  });

  // Retention Modal
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [retentionForm, setRetentionForm] = useState({
    oneYearStatus: 'still_at_company',
    currentCompany: '',
    currentPackageLpa: '',
    oneYearNotes: ''
  });

  // Record Placement Modal
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [placementForm, setPlacementForm] = useState({
    candidateId: '',
    company: '',
    role: '',
    packageLpa: '',
    placedAt: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Notification Broadcast Form
  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    link: '#/job-matching',
    channels: ['website', 'email'],
    scheduleType: 'now',
    programCode: ''
  });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, prRes, trRes, plRes] = await Promise.all([
        api.get('/admin/government/overview'),
        api.get('/admin/government/programs'),
        api.get(`/admin/government/trainees${programFilter ? `?programCode=${programFilter}` : ''}`),
        api.get('/admin/government/placements')
      ]);
      setOverview(ovRes.overview);
      setPrograms(prRes.programs || []);
      setTrainees(trRes.trainees || []);
      setPlacements(plRes.placements || []);
    } catch (err) {
      showToast('Could not load government program data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [programFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Program Create / Edit
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: programForm.title,
        programCode: programForm.programCode,
        provider: programForm.provider,
        description: programForm.description,
        durationWeeks: parseInt(programForm.durationWeeks, 10) || 8,
        taughtSkills: programForm.taughtSkills
          ? programForm.taughtSkills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        techFocusAreas: programForm.techFocusAreas
          ? programForm.techFocusAreas.split(',').map((s) => s.trim()).filter(Boolean)
          : []
      };

      if (editingProgram) {
        await api.patch(`/admin/government/programs/${editingProgram._id}`, payload);
        showToast('Training program updated.', 'success');
      } else {
        await api.post('/admin/government/programs', payload);
        showToast('New government training program created with authentication code.', 'success');
      }
      setProgramModalOpen(false);
      setEditingProgram(null);
      loadData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not save training program.', 'error');
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm('Are you sure you want to remove this training program?')) return;
    try {
      await api.delete(`/admin/government/programs/${programId}`);
      showToast('Training program deleted.', 'info');
      loadData();
    } catch (err) {
      showToast('Failed to delete program.', 'error');
    }
  };

  // Handle 1-Year Retention Save
  const handleSaveRetention = async (e) => {
    e.preventDefault();
    if (!selectedPlacement) return;
    try {
      await api.patch(`/admin/government/placements/${selectedPlacement._id}/verify-retention`, retentionForm);
      showToast('Trainee 1-Year retention status verified successfully.', 'success');
      setRetentionModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to verify trainee retention.', 'error');
    }
  };

  // Handle Placement Save
  const handleSavePlacement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/government/placements', placementForm);
      showToast('Trainee placement recorded successfully.', 'success');
      setPlacementModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to record placement.', 'error');
    }
  };

  // Handle Trainee Notification Dispatch
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) return;
    setSendingNotif(true);
    try {
      const res = await api.post('/admin/government/notifications/dispatch', notifForm);
      showToast(res.message || 'Notifications dispatched to trainees.', 'success');
      setNotifForm({
        title: '',
        message: '',
        link: '#/job-matching',
        channels: ['website', 'email'],
        scheduleType: 'now',
        programCode: ''
      });
    } catch (err) {
      showToast('Failed to dispatch notifications.', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Top Header */}
      <header className="site-header">
        <div
          className="layout-container"
          style={{
            height: '4.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BrandLogo variant="compact" />
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                Government Training Administrator
              </span>
              <span className="badge badge-neutral">
                {overview?.agencyName || 'National Skilling Council'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={triggerLogout}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'var(--border-subtle)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          className="layout-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'programs', label: 'Training Programs & Codes', icon: 'school' },
            { id: 'trainees', label: 'Enrolled Trainees Roster', icon: 'badge' },
            { id: 'placements', label: 'Post-Placement & 1-Year Retention', icon: 'work_history' },
            { id: 'notifications', label: 'Trainee Notifications', icon: 'forward_to_inbox' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '0.45rem 0.9rem',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="layout-container" style={{ flex: 1, padding: '2rem 0 3.5rem 0' }}>
        {/* KPI Banner */}
        {overview && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Trainees</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{overview.totalTrainees}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Training Programs</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>{overview.activeProgramsCount}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Placed Post-Training</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{overview.totalPlacedTrainees}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--saffron)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>1-Yr Retention Pending</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--saffron)', marginTop: '0.25rem' }}>{overview.retentionPendingCount}</div>
            </div>
          </section>
        )}

        {/* Tab 1: Training Programs & Codes */}
        {activeTab === 'programs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Government Training Programs</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Each program has a unique code that trainees use to authenticate completion and enroll in tracking.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProgram(null);
                  setProgramForm({
                    title: '',
                    programCode: '',
                    provider: overview?.agencyName || 'Skill India / PMKVY',
                    description: '',
                    durationWeeks: 8,
                    taughtSkills: '',
                    techFocusAreas: ''
                  });
                  setProgramModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Create Training Program &amp; Code
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {programs.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  No training programs created yet. Click "Create Training Program &amp; Code" to register your first initiative.
                </div>
              )}
              {programs.map((p) => (
                <div key={p._id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span className="badge badge-warning" style={{ fontWeight: 800 }}>
                        CODE: {p.programCode}
                      </span>
                      <span className="badge badge-success">{p.status}</span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.65rem' }}>{p.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {p.provider} &bull; {p.durationWeeks} Weeks Duration
                    </div>

                    {p.description && (
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-body)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                        {p.description}
                      </p>
                    )}

                    {p.taughtSkills && p.taughtSkills.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Taught Competencies:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {p.taughtSkills.map((s, idx) => (
                            <span key={idx} className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                              {s.name || s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>groups</span> {p.enrolledTraineeCount || 0} Trainees Enrolled
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => {
                          setEditingProgram(p);
                          setProgramForm({
                            title: p.title,
                            programCode: p.programCode,
                            provider: p.provider,
                            description: p.description || '',
                            durationWeeks: p.durationWeeks || 8,
                            taughtSkills: (p.taughtSkills || []).map((s) => s.name || s).join(', '),
                            techFocusAreas: (p.techFocusAreas || []).join(', ')
                          });
                          setProgramModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Edit Program"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(p._id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete Program"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Enrolled Trainees Roster */}
        {activeTab === 'trainees' && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Authenticated Trainees ({trainees.length})</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Trainees authenticated with training program codes. Track uploaded certificates and skills.
                </p>
              </div>

              {programs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter by Program:</label>
                  <select
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    <option value="">All Programs</option>
                    {programs.map((p) => (
                      <option key={p._id} value={p.programCode}>{p.programCode} - {p.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Trainee Name</th>
                    <th style={{ padding: '0.75rem' }}>Program Code</th>
                    <th style={{ padding: '0.75rem' }}>Training Program</th>
                    <th style={{ padding: '0.75rem' }}>Uploaded Certificates</th>
                    <th style={{ padding: '0.75rem' }}>Readiness</th>
                    <th style={{ padding: '0.75rem' }}>Placement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trainees.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No trainees authenticated under this program code yet. Trainees should register using program code (e.g. {programs[0]?.programCode || 'PMKVY-01'}).
                      </td>
                    </tr>
                  )}
                  {trainees.map((tr) => (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tr.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tr.email || tr.phone}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-warning" style={{ fontWeight: 800 }}>{tr.trainingProgramCode}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{tr.trainingProgramTitle}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {tr.certificateCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span className="badge badge-success">{tr.certificateCount} Certificate(s)</span>
                            {tr.certificates?.[0]?.url && (
                              <a href={tr.certificates[0].url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--secondary)' }}>
                                View on Cloudinary &rarr;
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-neutral">No certificate uploaded</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-info">{tr.readinessScore}%</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={tr.placementDetails ? 'badge badge-success' : 'badge badge-neutral'}>
                          {tr.employmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Post-Placement & 1-Year Retention */}
        {activeTab === 'placements' && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Trainee Post-Placement &amp; 1-Year Retention Tracker</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Tracks post-placement employment of trainees across training programs, and checks after 1 year if they are still placed there or elsewhere.
                </p>
              </div>
              <button
                onClick={() => setPlacementModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Record Trainee Placement
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Trainee</th>
                    <th style={{ padding: '0.75rem' }}>Program</th>
                    <th style={{ padding: '0.75rem' }}>Placed Employer</th>
                    <th style={{ padding: '0.75rem' }}>Package (CTC)</th>
                    <th style={{ padding: '0.75rem' }}>1-Year Retention Status</th>
                    <th style={{ padding: '0.75rem' }}>Current Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No trainee placements recorded yet. Click "Record Trainee Placement" to track post-training jobs.
                      </td>
                    </tr>
                  )}
                  {placements.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.candidate?.name || 'Trainee'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.candidate?.email || p.candidate?.phone}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-warning">{p.trainingProgram?.programCode || 'N/A'}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.company}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}>₹{p.packageLpa} LPA</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          className={
                            p.oneYearStatus === 'still_at_company'
                              ? 'badge badge-success'
                              : p.oneYearStatus === 'changed_company'
                              ? 'badge badge-info'
                              : p.oneYearStatus === 'unemployed'
                              ? 'badge badge-danger'
                              : 'badge badge-warning'
                          }
                        >
                          {p.oneYearStatus === 'still_at_company'
                            ? 'Still Employed'
                            : p.oneYearStatus === 'changed_company'
                            ? 'Changed Employer'
                            : p.oneYearStatus === 'unemployed'
                            ? 'Unemployed'
                            : 'Follow-up Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{p.currentCompany || p.company}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedPlacement(p);
                            setRetentionForm({
                              oneYearStatus: p.oneYearStatus === 'pending' ? 'still_at_company' : p.oneYearStatus,
                              currentCompany: p.currentCompany || p.company,
                              currentPackageLpa: p.currentPackageLpa || p.packageLpa || '',
                              oneYearNotes: p.oneYearNotes || ''
                            });
                            setRetentionModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Verify 1-Yr Retention
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Trainee Notifications */}
        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Send Trainee Notifications</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Broadcast updates, Adzuna job alerts, or retention check-in messages to trainees across In-App Bell, Email, and WhatsApp.
            </p>

            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Filter Target Program (Optional)</label>
                <select
                  value={notifForm.programCode}
                  onChange={(e) => setNotifForm({ ...notifForm, programCode: e.target.value })}
                  className="input-field"
                >
                  <option value="">All Enrolled Trainees (All Programs)</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p.programCode}>{p.programCode} - {p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Notification Title</label>
                <input
                  type="text"
                  placeholder="e.g. New Live Adzuna Job Openings Matching Your Certification"
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Enter message for trainees. Dispatched via Website In-App, Email, and WhatsApp."
                  value={notifForm.message}
                  onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Redirect Link (Clicked in message)</label>
                <input
                  type="text"
                  placeholder="#/job-matching"
                  value={notifForm.link}
                  onChange={(e) => setNotifForm({ ...notifForm, link: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Schedule Cycle</label>
                  <select
                    value={notifForm.scheduleType}
                    onChange={(e) => setNotifForm({ ...notifForm, scheduleType: e.target.value })}
                    className="input-field"
                  >
                    <option value="now">Now (Immediate send)</option>
                    <option value="weekly">Weekly Automated</option>
                    <option value="monthly">Monthly Automated</option>
                    <option value="quarterly">Quarterly Automated</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Delivery Channels</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {['website', 'email', 'whatsapp'].map((ch) => (
                      <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', textTransform: 'capitalize', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={notifForm.channels.includes(ch)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotifForm({ ...notifForm, channels: [...notifForm.channels, ch] });
                            } else {
                              setNotifForm({ ...notifForm, channels: notifForm.channels.filter((c) => c !== ch) });
                            }
                          }}
                        />
                        {ch === 'website' ? 'In-App Bell' : ch}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingNotif}
                className="btn btn-primary"
                style={{ padding: '0.75rem', marginTop: '0.5rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                {sendingNotif ? 'Dispatching Trainee Notifications…' : 'Send Trainee Notification'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Program Create/Edit Modal */}
      {programModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editingProgram ? 'Edit Training Program' : 'Create Government Training Program'}</h3>
              <button onClick={() => setProgramModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveProgram} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Training Program Title</label>
                <input type="text" placeholder="e.g. Cloud Native DevOps & Cyber Infrastructure" value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Unique Program Code (Trainees use this to authenticate)</label>
                <input type="text" placeholder="e.g. PMKVY-CLOUD-01, MSDE-AI-2026" value={programForm.programCode} onChange={(e) => setProgramForm({ ...programForm, programCode: e.target.value.toUpperCase() })} className="input-field" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Executing Provider / Agency</label>
                  <input type="text" placeholder="PMKVY / NSDC / MSDE" value={programForm.provider} onChange={(e) => setProgramForm({ ...programForm, provider: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Duration (Weeks)</label>
                  <input type="number" placeholder="8" value={programForm.durationWeeks} onChange={(e) => setProgramForm({ ...programForm, durationWeeks: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Taught Competencies / Skills (comma-separated)</label>
                <input type="text" placeholder="Docker, Kubernetes, Linux Administration, AWS Cloud" value={programForm.taughtSkills} onChange={(e) => setProgramForm({ ...programForm, taughtSkills: e.target.value })} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Program Description</label>
                <textarea rows={3} placeholder="National vocational certification under NCVET framework." value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setProgramModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProgram ? 'Save Changes' : 'Create Program'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Year Retention Verification Modal */}
      {retentionModalOpen && selectedPlacement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Trainee 1-Year Retention Follow-up</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Verify trainee <strong>{selectedPlacement.candidate?.name}</strong> post-training employment (Originally placed at {selectedPlacement.company} for ₹{selectedPlacement.packageLpa} LPA).
            </p>
            <form onSubmit={handleSaveRetention} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>After 1 Year, is the trainee still there?</label>
                <select value={retentionForm.oneYearStatus} onChange={(e) => setRetentionForm({ ...retentionForm, oneYearStatus: e.target.value })} className="input-field">
                  <option value="still_at_company">Yes, Still Employed at {selectedPlacement.company}</option>
                  <option value="changed_company">No, Switched to Another Company</option>
                  <option value="unemployed">Left Employment / Seeking New Job</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current Employer Name</label>
                <input type="text" placeholder="Company name" value={retentionForm.currentCompany} onChange={(e) => setRetentionForm({ ...retentionForm, currentCompany: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current CTC (LPA)</label>
                <input type="number" step="0.1" placeholder="e.g. 7.5" value={retentionForm.currentPackageLpa} onChange={(e) => setRetentionForm({ ...retentionForm, currentPackageLpa: e.target.value })} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notes</label>
                <textarea rows={2} placeholder="Status confirmed with trainee." value={retentionForm.oneYearNotes} onChange={(e) => setRetentionForm({ ...retentionForm, oneYearNotes: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setRetentionModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Retention</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Trainee Placement Modal */}
      {placementModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Record Trainee Placement</h3>
            <form onSubmit={handleSavePlacement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Trainee</label>
                <select value={placementForm.candidateId} onChange={(e) => setPlacementForm({ ...placementForm, candidateId: e.target.value })} className="input-field" required>
                  <option value="">Choose a trainee</option>
                  {trainees.map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name} ({tr.trainingProgramCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Company / Employer</label>
                <input type="text" placeholder="Company name" value={placementForm.company} onChange={(e) => setPlacementForm({ ...placementForm, company: e.target.value })} className="input-field" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Package (LPA)</label>
                  <input type="number" step="0.1" placeholder="6.5" value={placementForm.packageLpa} onChange={(e) => setPlacementForm({ ...placementForm, packageLpa: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Placed Date</label>
                  <input type="date" value={placementForm.placedAt} onChange={(e) => setPlacementForm({ ...placementForm, placedAt: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role</label>
                <input type="text" placeholder="e.g. Cloud Operations Technician" value={placementForm.role} onChange={(e) => setPlacementForm({ ...placementForm, role: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setPlacementModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Placement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
