import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export default function EmploymentCheckIns() {
  const { fetchCheckInSummary, fetchAllCheckIns, triggerCheckInCycle, updateCheckInAdminAction, showToast } = useApp();

  const [summary, setSummary] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sum, list] = await Promise.all([
      fetchCheckInSummary(),
      fetchAllCheckIns(filterStatus ? { status: filterStatus } : {})
    ]);
    setSummary(sum);
    setCheckIns(list);
    setLoading(false);
  }, [fetchCheckInSummary, fetchAllCheckIns, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    await triggerCheckInCycle();
    await loadData();
    setTriggering(false);
  }, [triggerCheckInCycle, loadData]);

  const handleAction = useCallback(async (checkInId, action) => {
    await updateCheckInAdminAction(checkInId, { adminActionTaken: action });
    await loadData();
  }, [updateCheckInAdminAction, loadData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">Quarterly Check-in Cycle</span>
              {summary && <span className="badge badge-neutral">Current: {summary.currentCycle}</span>}
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Employment Tracking &amp; Check-ins
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every 4 months, an email is sent to each student and trainee asking if they're still employed.
              Responses are tracked here. Students who want referrals can be matched with open drives.
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: triggering ? 'spin 1s linear infinite' : 'none' }}>send</span>
            {triggering ? 'Dispatching…' : 'Trigger Cycle Now'}
          </button>
        </div>
      </section>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Candidates</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{summary.totalCandidates}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emails Sent</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{summary.checkInsSent}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Response Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.2rem' }}>{summary.responseRate}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{summary.responded} responded</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employed</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>{summary.employed}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open to Work</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.2rem' }}>{summary.openToWork}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Want Referral</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--saffron)', marginTop: '0.2rem' }}>{summary.wantsReferral}</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)' }}>Filter by status:</span>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All</option>
          <option value="EMPLOYED">Employed</option>
          <option value="OPEN_TO_WORK">Open to Work</option>
          <option value="NOT_LOOKING">Not Looking</option>
        </select>
      </div>

      {/* Check-in table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Check-in Records ({checkIns.length})
        </h2>
        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</p>}
        {!loading && checkIns.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
            No check-ins yet. Click "Trigger Cycle Now" to send the first batch.
          </p>
        )}
        {!loading && checkIns.length > 0 && (
          <div className="table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Cycle</th>
                  <th>Email Sent</th>
                  <th>Responded</th>
                  <th>Status</th>
                  <th>Wants Referral</th>
                  <th>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {checkIns.map((ci) => (
                  <tr key={ci._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ci.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ci.user?.email || ci.user?.phone}</div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ci.cycle}</span></td>
                    <td>{new Date(ci.emailSentAt).toLocaleDateString()}</td>
                    <td>
                      {ci.respondedAt ? (
                        <span style={{ color: 'var(--success)', fontSize: '0.78rem' }}>{new Date(ci.respondedAt).toLocaleDateString()}</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pending</span>
                      )}
                    </td>
                    <td>
                      {ci.currentEmploymentStatus === 'EMPLOYED' && <span className="badge badge-success">Employed</span>}
                      {ci.currentEmploymentStatus === 'OPEN_TO_WORK' && <span className="badge badge-warning">Open to Work</span>}
                      {ci.currentEmploymentStatus === 'NOT_LOOKING' && <span className="badge badge-neutral">Not Looking</span>}
                      {!ci.currentEmploymentStatus && <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td>
                      {ci.wantsReferral ? (
                        <span className="badge badge-info">Yes — refer</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>No</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={ci.adminActionTaken}
                        onChange={(e) => handleAction(ci._id, e.target.value)}
                        className="input-field"
                        style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      >
                        <option value="NONE">None</option>
                        <option value="REFERRED">Referred</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
