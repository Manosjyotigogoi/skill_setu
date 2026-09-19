import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export default function TrainingPrograms() {
  const { fetchTrainingPrograms, fetchTrainingProgram, runProgramAiAnalysis, showToast } = useApp();

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    const data = await fetchTrainingPrograms();
    setPrograms(data);
    setLoading(false);
  }, [fetchTrainingPrograms]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const handleSelectProgram = useCallback(async (id) => {
    const program = await fetchTrainingProgram(id);
    setSelectedProgram(program);
  }, [fetchTrainingProgram]);

  const handleRunAi = useCallback(async (id) => {
    setAnalyzing(true);
    const result = await runProgramAiAnalysis(id);
    if (result) {
      const program = await fetchTrainingProgram(id);
      if (program) {
        setSelectedProgram(program);
      }
    }
    setAnalyzing(false);
  }, [fetchTrainingProgram, runProgramAiAnalysis]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">Training Program Impact</span>
          <span className="badge badge-warning">AI-Powered Analysis</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
          Training Programs &amp; Impact Metrics
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Track whether each training program meets current industry demand. Impact is measured on three parameters:
          trainees placed, company demand for taught skills, and AI-scored alignment with emerging tech.
        </p>
      </section>

      {/* Three-column layout: program list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: program list */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Active Programs ({programs.length})
          </h2>
          {loading && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading…</p>}
          {!loading && programs.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No training programs yet.</p>
          )}
          {programs.map((p) => (
            <button
              key={p._id}
              onClick={() => handleSelectProgram(p._id)}
              className={selectedProgram?._id === p._id ? 'btn btn-navy btn-sm' : 'btn btn-secondary btn-sm'}
              style={{ textAlign: 'left', padding: '0.65rem 0.85rem', justifyContent: 'flex-start' }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <strong style={{ fontSize: '0.82rem' }}>{p.title}</strong>
                <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{p.provider} · {p.durationWeeks}w</span>
              </span>
            </button>
          ))}
        </div>

        {/* Right: program detail with impact metrics */}
        <div>
          {!selectedProgram && (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a program to view its impact metrics.
            </div>
          )}

          {selectedProgram && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Program header */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ maxWidth: '600px' }}>
                    <span className="badge badge-info" style={{ marginBottom: '0.5rem' }}>{selectedProgram.provider}</span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedProgram.title}</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>{selectedProgram.description}</p>
                  </div>
                  <button
                    onClick={() => handleRunAi(selectedProgram._id)}
                    disabled={analyzing}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.55rem 1.1rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: analyzing ? 'spin 1s linear infinite' : 'none' }}>auto_awesome</span>
                    {analyzing ? 'AI analyzing…' : 'Run AI Analysis'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {selectedProgram.taughtSkills?.map((s) => (
                    <span key={s.name} className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{s.name} ({s.nsqfLevel})</span>
                  ))}
                </div>
              </div>

              {/* Three impact metric cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Metric 1: Placement count */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--success)' }}>work</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    {selectedProgram.impactMetrics?.placementCount ?? 0}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Trainees Placed</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>
                    Out of {selectedProgram.impactMetrics?.enrolledCount ?? 0} enrolled
                  </div>
                </div>

                {/* Metric 2: Company demand */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--secondary)' }}>domain</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    {selectedProgram.impactMetrics?.companyDemandCount ?? 0}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Companies Hiring</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>
                    Active drives matching taught skills
                  </div>
                </div>

                {/* Metric 3: Tech alignment */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--saffron)' }}>trending_up</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
                    {selectedProgram.impactMetrics?.techAlignmentScore != null
                      ? `${selectedProgram.impactMetrics.techAlignmentScore}/100`
                      : '—'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Tech Alignment</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>
                    {selectedProgram.impactMetrics?.lastAnalyzedAt
                      ? `Last analyzed: ${new Date(selectedProgram.impactMetrics.lastAnalyzedAt).toLocaleDateString()}`
                      : 'Run AI analysis to score'}
                  </div>
                </div>
              </div>

              {/* AI Summary + Recommendations */}
              {selectedProgram.impactMetrics?.aiSummary && (
                <div className="card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>auto_awesome</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Impact Assessment</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {selectedProgram.impactMetrics.aiSummary}
                  </p>
                  {selectedProgram.impactMetrics.recommendations?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Recommendations
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {selectedProgram.impactMetrics.recommendations.map((rec, i) => (
                          <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Tech focus areas */}
              {selectedProgram.techFocusAreas?.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Tech Focus Areas</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedProgram.techFocusAreas.map((area) => (
                      <span key={area} className="badge badge-info" style={{ fontSize: '0.75rem' }}>{area}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
