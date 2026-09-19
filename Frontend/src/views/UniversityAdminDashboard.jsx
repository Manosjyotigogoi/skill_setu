import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

export default function UniversityAdminDashboard() {
  const { showToast, triggerLogout } = useApp();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'drives' | 'applications' | 'retention' | 'notifications'
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [applications, setApplications] = useState([]);
  const [placements, setPlacements] = useState([]);

  // Modals
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [driveForm, setDriveForm] = useState({
    company: '',
    role: '',
    location: '',
    ctcMinLpa: '',
    ctcMaxLpa: '',
    eligibilityCgpa: '',
    deadline: '',
    driveDate: '',
    rounds: '',
    requiredSkills: ''
  });

  // Application / Interview Modal
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appStatusForm, setAppStatusForm] = useState({
    status: 'Shortlisted',
    interviewDate: '',
    notes: ''
  });

  // 1-Year Retention Modal
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [retentionForm, setRetentionForm] = useState({
    oneYearStatus: 'still_at_company',
    currentCompany: '',
    currentPackageLpa: '',
    oneYearNotes: ''
  });

  // Placement Create Modal
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
    scheduleType: 'now'
  });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Load Overview Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, stRes, drRes, plRes] = await Promise.all([
        api.get('/admin/university/overview'),
        api.get('/admin/university/students'),
        api.get('/admin/university/drives'),
        api.get('/admin/university/placements')
      ]);
      setOverview(ovRes.overview);
      setStudents(stRes.students || []);
      setDrives(drRes.drives || []);
      setPlacements(plRes.placements || []);
    } catch (err) {
      showToast('Could not load university data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load drive applications
  const loadDriveApplications = async (drive) => {
    setSelectedDrive(drive);
    try {
      const res = await api.get(`/admin/university/drives/${drive._id}/applications`);
      setApplications(res.applications || []);
      setActiveTab('applications');
    } catch (err) {
      showToast('Could not load applications for drive.', 'error');
    }
  };

  // Handle Drive Form submit (Create or Edit)
  const handleSaveDrive = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        company: driveForm.company,
        role: driveForm.role,
        location: driveForm.location,
        ctcMinLpa: parseFloat(driveForm.ctcMinLpa) || 0,
        ctcMaxLpa: parseFloat(driveForm.ctcMaxLpa) || parseFloat(driveForm.ctcMinLpa) || 0,
        eligibilityCgpa: parseFloat(driveForm.eligibilityCgpa) || 0,
        deadline: driveForm.deadline || undefined,
        driveDate: driveForm.driveDate || undefined,
        rounds: driveForm.rounds,
        requiredSkills: driveForm.requiredSkills
          ? driveForm.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
          : []
      };

      if (editingDrive) {
        await api.patch(`/admin/university/drives/${editingDrive._id}`, payload);
        showToast('Campus placement drive updated.', 'success');
      } else {
        await api.post('/admin/university/drives', payload);
        showToast('New campus placement drive posted.', 'success');
      }
      setDriveModalOpen(false);
      setEditingDrive(null);
      loadData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not save drive.', 'error');
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm('Are you sure you want to delete this placement drive?')) return;
    try {
      await api.delete(`/admin/university/drives/${driveId}`);
      showToast('Placement drive removed.', 'info');
      loadData();
    } catch (err) {
      showToast('Failed to delete drive.', 'error');
    }
  };

  // Handle Application Interview / Approval Submit
  const handleSaveApplication = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await api.patch(`/admin/university/applications/${selectedApp._id}`, appStatusForm);
      showToast(`Student application updated to "${appStatusForm.status}" and notification dispatched.`, 'success');
      setAppModalOpen(false);
      if (selectedDrive) loadDriveApplications(selectedDrive);
    } catch (err) {
      showToast('Failed to update application.', 'error');
    }
  };

  // Handle 1-Year Retention Submit
  const handleSaveRetention = async (e) => {
    e.preventDefault();
    if (!selectedPlacement) return;
    try {
      await api.patch(`/admin/university/placements/${selectedPlacement._id}/verify-retention`, retentionForm);
      showToast('1-Year retention check verified and student profile updated.', 'success');
      setRetentionModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to verify retention.', 'error');
    }
  };

  // Handle Manual Placement Record Create
  const handleSavePlacement = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/university/placements', placementForm);
      showToast('Placement recorded successfully.', 'success');
      setPlacementModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to record placement.', 'error');
    }
  };

  // Handle Notification Dispatch
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) return;
    setSendingNotif(true);
    try {
      const res = await api.post('/admin/university/notifications/dispatch', notifForm);
      showToast(res.message || 'Notifications dispatched successfully.', 'success');
      setNotifForm({
        title: '',
        message: '',
        link: '#/job-matching',
        channels: ['website', 'email'],
        scheduleType: 'now'
      });
    } catch (err) {
      showToast('Failed to dispatch notifications.', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  const copyUniversityCode = () => {
    if (overview?.universityCode) {
      navigator.clipboard.writeText(overview.universityCode);
      showToast(`University code "${overview.universityCode}" copied! Share with your students to authenticate.`, 'success');
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
              <span className="badge badge-info" style={{ fontWeight: 700 }}>
                University Placement Cell Portal
              </span>
              <span className="badge badge-neutral">
                {overview?.universityName || 'Placement Administration'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {overview?.universityCode && (
              <button
                onClick={copyUniversityCode}
                className="btn btn-secondary btn-sm"
                title="Click to copy code to share with students"
                style={{ gap: '0.4rem', padding: '0.45rem 0.75rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--secondary)' }}>key</span>
                <span>Code: <strong>{overview.universityCode}</strong></span>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>content_copy</span>
              </button>
            )}
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
            { id: 'overview', label: 'Students & Overview', icon: 'groups' },
            { id: 'drives', label: 'Campus Placement Drives', icon: 'business_center' },
            { id: 'applications', label: 'Drive Applications & Interviews', icon: 'event_available' },
            { id: 'retention', label: 'Placements & 1-Year Retention', icon: 'history_edu' },
            { id: 'notifications', label: 'Multi-Channel Notifications', icon: 'notifications_active' }
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
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Students</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{overview.totalStudents}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Drives</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>{overview.activeDrives}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Placed Students</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{overview.totalPlaced}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg / Max Package</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                {overview.averagePackage} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {overview.highestPackage}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--saffron)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>1-Yr Follow-up Pending</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--saffron)', marginTop: '0.25rem' }}>{overview.oneYearFollowUpPending}</div>
            </div>
          </section>
        )}

        {/* Tab 1: Students & Overview */}
        {activeTab === 'overview' && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Enrolled Students ({students.length})</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Students authenticated using university code {overview?.universityCode}</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Roll No / Name</th>
                    <th style={{ padding: '0.75rem' }}>Branch &amp; Degree</th>
                    <th style={{ padding: '0.75rem' }}>CGPA</th>
                    <th style={{ padding: '0.75rem' }}>Skills</th>
                    <th style={{ padding: '0.75rem' }}>Readiness</th>
                    <th style={{ padding: '0.75rem' }}>Applications</th>
                    <th style={{ padding: '0.75rem' }}>Placement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students enrolled yet. Share your university code <strong>{overview?.universityCode}</strong> with your students to register.
                      </td>
                    </tr>
                  )}
                  {students.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{st.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.rollNo || st.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{st.branch || 'General'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.degree}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{st.cgpa || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-info">{st.skillsCount} skills</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-success">{st.readinessScore}%</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{st.applicationsCount} applied</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={st.placementDetails ? 'badge badge-success' : 'badge badge-neutral'}>
                          {st.placementStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Campus Placement Drives */}
        {activeTab === 'drives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Campus Placement Drives</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage jobs given by companies to your placement cell.</p>
              </div>
              <button
                onClick={() => {
                  setEditingDrive(null);
                  setDriveForm({
                    company: '',
                    role: '',
                    location: '',
                    ctcMinLpa: '',
                    ctcMaxLpa: '',
                    eligibilityCgpa: '',
                    deadline: '',
                    driveDate: '',
                    rounds: '',
                    requiredSkills: ''
                  });
                  setDriveModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Post New Campus Placement Drive
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {drives.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  No campus drives posted yet. Click "Post New Campus Placement Drive" above to add opportunities.
                </div>
              )}
              {drives.map((d) => (
                <div key={d._id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span className="badge badge-info">{d.company}</span>
                      <span className={d.status === 'OPEN' ? 'badge badge-success' : 'badge badge-neutral'}>{d.status}</span>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{d.role}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle' }}>location_on</span> {d.location}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.5rem' }}>
                      CTC: {d.ctc || `₹${d.ctcMinLpa} - ${d.ctcMaxLpa} LPA`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Eligibility: Min CGPA {d.eligibilityCgpa || 'Any'}
                    </div>
                    {d.requiredSkills && d.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
                        {d.requiredSkills.map((s, idx) => (
                          <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => loadDriveApplications(d)}
                      className="btn btn-navy btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>people</span>
                      Applicants ({d.applicationsCount || 0})
                    </button>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => {
                          setEditingDrive(d);
                          setDriveForm({
                            company: d.company,
                            role: d.role,
                            location: d.location,
                            ctcMinLpa: d.ctcMinLpa || '',
                            ctcMaxLpa: d.ctcMaxLpa || '',
                            eligibilityCgpa: d.eligibilityCgpa || '',
                            deadline: d.deadline ? d.deadline.split('T')[0] : '',
                            driveDate: d.driveDate ? d.driveDate.split('T')[0] : '',
                            rounds: d.rounds || '',
                            requiredSkills: (d.requiredSkills || []).join(', ')
                          });
                          setDriveModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Edit Drive"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDrive(d._id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete Drive"
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

        {/* Tab 3: Drive Applications & Interviews */}
        {activeTab === 'applications' && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedDrive ? `${selectedDrive.company} (${selectedDrive.role}) Applications` : 'Drive Student Applications'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Approve students for drives, schedule interview dates, and trigger multi-channel notifications (In-App, Email, WhatsApp).
                </p>
              </div>
              {drives.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter Drive:</label>
                  <select
                    value={selectedDrive?._id || ''}
                    onChange={(e) => {
                      const d = drives.find((item) => item._id === e.target.value);
                      if (d) loadDriveApplications(d);
                    }}
                    className="input-field"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    <option value="">Select a drive</option>
                    {drives.map((d) => (
                      <option key={d._id} value={d._id}>{d.company} - {d.role}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Academic Details</th>
                    <th style={{ padding: '0.75rem' }}>Skills &amp; Readiness</th>
                    <th style={{ padding: '0.75rem' }}>Application Status</th>
                    <th style={{ padding: '0.75rem' }}>Interview Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No applications submitted for this placement drive yet.
                      </td>
                    </tr>
                  )}
                  {applications.map((app) => (
                    <tr key={app._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{app.user?.name || 'Student'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.user?.email || app.user?.phone}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{app.user?.branch || 'N/A'} (CGPA: {app.user?.cgpa || '—'})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {app.user?.rollNo || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-success">{app.user?.readinessScore ?? 0}% Ready</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          className={
                            app.status === 'Selected'
                              ? 'badge badge-success'
                              : app.status === 'Interview Scheduled'
                              ? 'badge badge-info'
                              : app.status === 'Shortlisted'
                              ? 'badge badge-warning'
                              : 'badge badge-neutral'
                          }
                        >
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: app.interviewDate ? 600 : 400 }}>
                        {app.interviewDate ? new Date(app.interviewDate).toLocaleString() : 'Not scheduled'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setAppStatusForm({
                              status: app.status || 'Shortlisted',
                              interviewDate: app.interviewDate ? app.interviewDate.split('T')[0] : '',
                              notes: app.notes || ''
                            });
                            setAppModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Schedule / Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Placements & 1-Year Retention Tracker */}
        {activeTab === 'retention' && (
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Placed Students &amp; 1-Year Retention Tracking</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Tracks student initial placements and verifies 1 year later whether they are still placed at that company or moved elsewhere.
                </p>
              </div>
              <button
                onClick={() => setPlacementModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Record New Placement
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Student</th>
                    <th style={{ padding: '0.75rem' }}>Initial Placed Company</th>
                    <th style={{ padding: '0.75rem' }}>Package (CTC)</th>
                    <th style={{ padding: '0.75rem' }}>Placed Date</th>
                    <th style={{ padding: '0.75rem' }}>1-Year Follow-up Status</th>
                    <th style={{ padding: '0.75rem' }}>Current Company (After 1 Yr)</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No placement records logged yet. Use "Record New Placement" to track placed students.
                      </td>
                    </tr>
                  )}
                  {placements.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.candidate?.name || 'Student'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.candidate?.rollNo || p.candidate?.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.company}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}>₹{p.packageLpa} LPA</td>
                      <td style={{ padding: '0.75rem' }}>{p.placedAt ? new Date(p.placedAt).toLocaleDateString() : '—'}</td>
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
                            ? 'Still Placed There'
                            : p.oneYearStatus === 'changed_company'
                            ? 'Switched Company'
                            : p.oneYearStatus === 'unemployed'
                            ? 'Left Employment'
                            : 'Follow-up Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {p.currentCompany || p.company}
                        {p.currentPackageLpa ? ` (₹${p.currentPackageLpa} LPA)` : ''}
                      </td>
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
                          Verify 1-Yr Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Multi-Channel Notifications */}
        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Send Student Notifications</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Dispatch announcements, interview reminders, or placement check-ins to your students via multiple channels with configurable cycles.
            </p>

            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Notification Title</label>
                <input
                  type="text"
                  placeholder="e.g. Upcoming TCS Digital Placement Drive / Interview Date"
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
                  placeholder="Enter detailed message. Students will receive this on the website, email, and WhatsApp."
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
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Dispatch Schedule Interval</label>
                  <select
                    value={notifForm.scheduleType}
                    onChange={(e) => setNotifForm({ ...notifForm, scheduleType: e.target.value })}
                    className="input-field"
                  >
                    <option value="now">Now (Immediate manual send)</option>
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
                {sendingNotif ? 'Dispatching Notifications…' : 'Send / Schedule Notification'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Drive Create/Edit Modal */}
      {driveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editingDrive ? 'Edit Placement Drive' : 'Create Campus Placement Drive'}</h3>
              <button onClick={() => setDriveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveDrive} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Company Name</label>
                <input type="text" placeholder="e.g. Google, TCS, Microsoft" value={driveForm.company} onChange={(e) => setDriveForm({ ...driveForm, company: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Job Role</label>
                <input type="text" placeholder="e.g. Software Development Engineer" value={driveForm.role} onChange={(e) => setDriveForm({ ...driveForm, role: e.target.value })} className="input-field" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Min CTC (LPA)</label>
                  <input type="number" step="0.1" placeholder="8.5" value={driveForm.ctcMinLpa} onChange={(e) => setDriveForm({ ...driveForm, ctcMinLpa: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Max CTC (LPA)</label>
                  <input type="number" step="0.1" placeholder="12.0" value={driveForm.ctcMaxLpa} onChange={(e) => setDriveForm({ ...driveForm, ctcMaxLpa: e.target.value })} className="input-field" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Min Eligibility CGPA</label>
                  <input type="number" step="0.1" placeholder="7.0" value={driveForm.eligibilityCgpa} onChange={(e) => setDriveForm({ ...driveForm, eligibilityCgpa: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Location</label>
                  <input type="text" placeholder="Bengaluru / Hyderabad" value={driveForm.location} onChange={(e) => setDriveForm({ ...driveForm, location: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Required Skills (comma-separated)</label>
                <input type="text" placeholder="React.js, Python, DSA, SQL" value={driveForm.requiredSkills} onChange={(e) => setDriveForm({ ...driveForm, requiredSkills: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Application Deadline</label>
                  <input type="date" value={driveForm.deadline} onChange={(e) => setDriveForm({ ...driveForm, deadline: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Drive / Interview Date</label>
                  <input type="date" value={driveForm.driveDate} onChange={(e) => setDriveForm({ ...driveForm, driveDate: e.target.value })} className="input-field" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setDriveModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDrive ? 'Save Changes' : 'Post Drive'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {appModalOpen && selectedApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Update Application &amp; Interview</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Candidate: <strong>{selectedApp.user?.name}</strong> ({selectedApp.drive?.company})
            </p>
            <form onSubmit={handleSaveApplication} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Status</label>
                <select value={appStatusForm.status} onChange={(e) => setAppStatusForm({ ...appStatusForm, status: e.target.value })} className="input-field">
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Selected">Selected / Placed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Interview Date &amp; Time</label>
                <input type="datetime-local" value={appStatusForm.interviewDate} onChange={(e) => setAppStatusForm({ ...appStatusForm, interviewDate: e.target.value })} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notes / Instructions for Student</label>
                <textarea rows={3} placeholder="e.g. Please bring your resume and prepare for technical round 1." value={appStatusForm.notes} onChange={(e) => setAppStatusForm({ ...appStatusForm, notes: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setAppModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save &amp; Notify Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Year Retention Verification Modal */}
      {retentionModalOpen && selectedPlacement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>1-Year Retention Follow-up</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Verify student <strong>{selectedPlacement.candidate?.name}</strong> post-placement status (Originally placed at {selectedPlacement.company} for ₹{selectedPlacement.packageLpa} LPA).
            </p>
            <form onSubmit={handleSaveRetention} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>After 1 Year, is the student still there?</label>
                <select value={retentionForm.oneYearStatus} onChange={(e) => setRetentionForm({ ...retentionForm, oneYearStatus: e.target.value })} className="input-field">
                  <option value="still_at_company">Yes, Still Placed at {selectedPlacement.company}</option>
                  <option value="changed_company">No, Switched to a New Company / Employer</option>
                  <option value="unemployed">Left Employment / Seeking Opportunities</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current Employer Name</label>
                <input type="text" placeholder="Company name" value={retentionForm.currentCompany} onChange={(e) => setRetentionForm({ ...retentionForm, currentCompany: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current CTC (LPA)</label>
                <input type="number" step="0.1" placeholder="e.g. 14.5" value={retentionForm.currentPackageLpa} onChange={(e) => setRetentionForm({ ...retentionForm, currentPackageLpa: e.target.value })} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Verification Notes</label>
                <textarea rows={2} placeholder="Verified via LinkedIn / Alumni check-in call." value={retentionForm.oneYearNotes} onChange={(e) => setRetentionForm({ ...retentionForm, oneYearNotes: e.target.value })} className="input-field" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setRetentionModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm 1-Year Retention</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Placement Modal */}
      {placementModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Record Student Placement</h3>
            <form onSubmit={handleSavePlacement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Student</label>
                <select value={placementForm.candidateId} onChange={(e) => setPlacementForm({ ...placementForm, candidateId: e.target.value })} className="input-field" required>
                  <option value="">Choose a student</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.rollNo || st.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Company Name</label>
                <input type="text" placeholder="e.g. Tata Consultancy Services" value={placementForm.company} onChange={(e) => setPlacementForm({ ...placementForm, company: e.target.value })} className="input-field" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Package (LPA)</label>
                  <input type="number" step="0.1" placeholder="9.5" value={placementForm.packageLpa} onChange={(e) => setPlacementForm({ ...placementForm, packageLpa: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Placed Date</label>
                  <input type="date" value={placementForm.placedAt} onChange={(e) => setPlacementForm({ ...placementForm, placedAt: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Role / Designation</label>
                <input type="text" placeholder="Software Engineer" value={placementForm.role} onChange={(e) => setPlacementForm({ ...placementForm, role: e.target.value })} className="input-field" />
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
