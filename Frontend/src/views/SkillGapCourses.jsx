import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';

function SkillBar({ skill }) {
  // Backend's annotateRoleMatch returns { name, status, score, requiredScore, currentScore }
  // — but for VERIFIED skills only `score` is populated, and for GAP skills
  // only `requiredScore` + `currentScore` are. Guard against missing values.
  const current = skill.status === 'VERIFIED' ? (skill.score ?? 0) : (skill.currentScore ?? 0);
  const target = skill.status === 'VERIFIED' ? (skill.score ?? 0) : (skill.requiredScore ?? 0);
  const completion = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{skill.name}</span>
        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{current}% / {target}%</span>
      </div>
      <div className="progress-bar-bg" style={{ height: '8px' }}>
        <div className="progress-bar-fill" style={{ width: `${completion}%`, background: completion >= 80 ? 'var(--success)' : 'var(--saffron)' }} />
      </div>
    </div>
  );
}

export default function SkillGapCourses() {
  const { targetRoles, courses, toggleCourseEnrollment, discoverCourses, showToast, setActiveTab } = useApp();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // AI-discovered courses (live web search results for the gap skills)
  const [aiCourses, setAiCourses] = useState([]);
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Keep selectedRoleId in sync as roles load from the backend.
  useEffect(() => {
    if (targetRoles && targetRoles.length > 0) {
      setSelectedRoleId((prev) => prev || targetRoles[0].id);
    }
  }, [targetRoles]);

  const roles = targetRoles || [];
  const activeRole = roles.find((role) => role.id === selectedRoleId) || roles[0];

  const filteredRoles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter((role) =>
      role.title.toLowerCase().includes(query) ||
      (role.tier || '').toLowerCase().includes(query) ||
      role.requiredSkills.some((skill) => skill.name.toLowerCase().includes(query))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, targetRoles]);

  const gaps = (activeRole?.requiredSkills || []).filter((skill) => skill.status === 'GAP');
  const gapNames = gaps.map((g) => g.name);
  const recommendedCourses = (courses || []).filter((course) =>
    course.bridgesSkills.some((courseSkill) => gaps.some((gap) =>
      gap.name.toLowerCase().includes(courseSkill.toLowerCase()) || courseSkill.toLowerCase().includes(gap.name.toLowerCase())
    ))
  );

  // Auto-discover online courses for the current gaps via AI.
  // Triggers when the user changes role OR when the page first loads with gaps.
  const loadAiCourses = async () => {
    if (!gapNames || gapNames.length === 0) {
      setAiCourses([]);
      setAiRecommendation('');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const result = await discoverCourses(gapNames);
    if (result.error) {
      setAiError(result.error);
    } else {
      setAiCourses(result.courses || []);
      setAiRecommendation(result.recommendation || '');
    }
    setAiLoading(false);
  };

  useEffect(() => {
    // Auto-load AI courses when the gap list changes (i.e. user picks a different role)
    if (gapNames.length > 0) {
      loadAiCourses();
    } else {
      setAiCourses([]);
      setAiRecommendation('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId, targetRoles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section className="card" style={{ padding: '2rem 2.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">Skill Analytics &bull; NCrF Framework</span>
          <span className="badge badge-warning">Recommendations from verified gaps</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '720px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Courses &amp; Skills</h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Compare verified skills with target roles, see readiness gaps, and choose courses that bridge them.
            </p>
          </div>
          <div style={{ minWidth: 'min(100%, 280px)', flex: '0 1 320px' }}>
            <label htmlFor="role-search" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Search roles or skills</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--text-light)' }}>search</span>
              <input id="role-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="e.g. Cloud, React, Kubernetes" className="input-field" style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Target roles</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select a path to compare its requirements.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-neutral">{filteredRoles.length} matching roles</span>
            <button
              onClick={() => setActiveTab('user-id')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
              Edit Target Roles
            </button>
          </div>
        </div>
        {roles.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              You haven't selected any target career roles yet.
            </p>
            <button onClick={() => setActiveTab('user-id')} className="btn btn-primary btn-sm">
              Choose Target Roles in Profile
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {filteredRoles.map((role) => (
              <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={role.id === activeRole?.id ? 'btn btn-navy' : 'btn btn-secondary'} style={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: '68px' }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                  <strong>{role.title}</strong>
                  <small style={{ opacity: 0.8 }}>{role.currentMatch}% current match</small>
                </span>
              </button>
            ))}
            {filteredRoles.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No roles or skills match that search.</p>}
          </div>
        )}
      </section>

      {activeRole && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Skill comparison</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeRole.title} &bull; {activeRole.tier}</p>
                </div>
                <span className="badge badge-info">{activeRole.currentMatch}% match</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activeRole.requiredSkills.map((skill) => <SkillBar key={skill.name} skill={skill} />)}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Readiness path</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Close the highest-impact gaps first.</p>
                </div>
                <span className="badge badge-warning">Target {activeRole.targetReadiness}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {gaps.map((gap) => {
                  const need = Math.max(0, (gap.requiredScore || 0) - (gap.currentScore || 0));
                  return (
                  <div key={gap.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{gap.name}</span>
                    <span className="badge badge-warning">+{need}% needed</span>
                  </div>
                  );
                })}
                {gaps.length === 0 && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>All listed skills are verified for this role.</p>}
              </div>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Recommended Free Courses</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>100% free courses from verified platforms matched to the selected role's current skill gaps.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {recommendedCourses.map((course) => (
                <div key={course.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-info">{course.provider}</span>
                      <span className="badge badge-success">{course.freeStatus || '100% Free'}</span>
                      {course.level && <span className="badge badge-neutral">{course.level}</span>}
                    </div>
                    {course.rating && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--saffron)' }}>★ {course.rating}</span>}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.25rem 0 0.35rem' }}>{course.title}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {course.duration} {course.instructor ? `• ${course.instructor}` : ''}
                    </p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-body)' }}>
                    Bridges: <strong>{(course.bridgesSkills || course.skills || []).join(', ')}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {course.url ? (
                      <a href={course.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                        Open Course
                      </a>
                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>{course.accreditation}</span>}
                    <button onClick={() => toggleCourseEnrollment(course.id)} className={course.enrolled ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{course.enrolled ? 'task_alt' : 'school'}</span>
                      {course.enrolled ? 'Enrolled' : 'Track Enrollment'}
                    </button>
                  </div>
                </div>
              ))}
              {recommendedCourses.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No course currently maps to these gaps.</p>}
            </div>
          </section>

          {/* AI-discovered online courses (MongoDB-backed 100% Free Learning Resources) */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>auto_awesome</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>AI-Discovered Free Learning Resources</h2>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Free verified learning resources from freeCodeCamp, Khan Academy, MIT OpenCourseWare, SWAYAM, edX, and YouTube.
                </p>
              </div>
              <button
                onClick={loadAiCourses}
                disabled={aiLoading || gapNames.length === 0}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.45rem 0.85rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: aiLoading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
                {aiLoading ? 'Searching…' : 'Refresh AI Courses'}
              </button>
            </div>

            {aiRecommendation && (
              <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--secondary-tint)', borderColor: 'var(--secondary)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>lightbulb</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>{aiRecommendation}</p>
              </div>
            )}

            {aiError && (
              <div className="card" style={{ padding: '1rem 1.25rem', borderColor: 'var(--danger, #FCA5A5)', color: 'var(--danger, #B91C1C)', fontSize: '0.85rem' }}>
                {aiError}
              </div>
            )}

            {aiLoading && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Querying free learning resources for: {gapNames.join(', ')}…
              </div>
            )}

            {!aiLoading && aiCourses.length === 0 && !aiError && gapNames.length > 0 && (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Click "Refresh AI Courses" to search for free courses on: {gapNames.join(', ')}
              </div>
            )}

            {aiCourses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {aiCourses.map((c, i) => (
                  <div key={c.id || i} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{c.provider || c.source}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>{c.freeStatus || '100% Free'}</span>
                        {c.level && <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>{c.level}</span>}
                      </div>
                      {c.rating && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--saffron)' }}>★ {c.rating}</span>}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35, margin: 0 }}>{c.title}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', marginBottom: 0 }}>
                        {c.duration} {c.instructor ? `• ${c.instructor}` : ''}
                      </p>
                    </div>
                    {c.matchedGaps && c.matchedGaps.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {c.matchedGaps.map((g) => (
                          <span key={g} className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Bridges: {g}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', fontSize: '0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
                        Open Free Course
                      </a>
                      {c.id && (
                        <button onClick={() => toggleCourseEnrollment(c.id)} className={c.enrolled ? 'btn btn-secondary btn-sm' : 'btn btn-secondary btn-sm'} style={{ fontSize: '0.75rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{c.enrolled ? 'task_alt' : 'school'}</span>
                          {c.enrolled ? 'Enrolled' : 'Track'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

    </div>
  );
}
