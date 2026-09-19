import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiError } from '../lib/api';

const AppContext = createContext(null);

// Tracks whether we have already attempted an auth-hydration call on mount.
// Prevents the redirect-to-auth flash on a page reload when a valid cookie
// is still present.
let didInitialAuthProbe = false;

export function AppProvider({ children }) {
  // ----- Auth state -----
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthBooting, setIsAuthBooting] = useState(!didInitialAuthProbe);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [authMethod, setAuthMethod] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'student' | 'trainee' | 'admin'
  const [activeTab, setActiveTab] = useState('landing');

  // ----- Domain state (always re-fetched after login) -----
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [targetRoles, setTargetRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [courses, setCourses] = useState([]);
  const [campusDrives, setCampusDrives] = useState([]);
  const [adminRoster, setAdminRoster] = useState([]);
  const [adminTelemetry, setAdminTelemetry] = useState(null);

  // In-app notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Upload & Extraction pipeline state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractionInProgress, setExtractionInProgress] = useState(false);
  const [extractionStep, setExtractionStep] = useState(0);

  // Selected job for apply modal
  const [activeJobModal, setActiveJobModal] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ----- Initial auth hydration -----
  // On first mount, probe GET /api/auth/me to see if a valid cookie is
  // present. If so, log the user back in immediately (survives refresh).
  useEffect(() => {
    if (didInitialAuthProbe) return;
    didInitialAuthProbe = true;

    (async () => {
      try {
        const { user } = await api.get('/auth/me');
        hydrateUser(user);
      } catch (err) {
        // 401 is expected when not logged in — only surface other errors.
        if (!(err instanceof ApiError) || err.status !== 401) {
          // Network down, etc — show a quiet toast but don't block the UI.
          console.warn('Auth hydration failed:', err.message);
        }
      } finally {
        setIsAuthBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Data fetching helpers (called after every successful login) -----
  const fetchProfile = useCallback(async () => {
    try {
      const { profile: p } = await api.get('/profile/me');
      setProfile(p);
      return p;
    } catch {
      showToast('Could not load your profile.', 'error');
      return null;
    }
  }, [showToast]);

  const fetchSkills = useCallback(async () => {
    try {
      const { skills: s } = await api.get('/skills');
      setSkills(s);
      return s;
    } catch {
      showToast('Could not load verified skills.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchTargetRoles = useCallback(async () => {
    try {
      const { roles } = await api.get('/roles');
      setTargetRoles(roles);
      if (roles.length > 0) setSelectedRole((prev) => prev || roles[0]);
      return roles;
    } catch {
      showToast('Could not load target roles.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchAllRoles = useCallback(async () => {
    try {
      const { roles } = await api.get('/roles/all');
      return roles || [];
    } catch {
      showToast('Could not load role catalog.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchCourses = useCallback(async () => {
    try {
      const { courses: c } = await api.get('/courses');
      setCourses(c);
      return c;
    } catch {
      showToast('Could not load recommended courses.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchDrives = useCallback(async () => {
    try {
      const { drives } = await api.get('/drives');
      setCampusDrives(drives);
      return drives;
    } catch {
      showToast('Could not load campus drives.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { documents } = await api.get('/documents');
      setUploadedFiles(documents.map(normalizeDocument));
      return documents;
    } catch {
      showToast('Could not load uploaded documents.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchAdminRoster = useCallback(async () => {
    try {
      const { roster } = await api.get('/admin/roster');
      setAdminRoster(roster);
      return roster;
    } catch {
      showToast('Could not load candidate roster.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchAdminTelemetry = useCallback(async () => {
    try {
      const { telemetry } = await api.get('/admin/telemetry');
      setAdminTelemetry(telemetry);
      return telemetry;
    } catch {
      showToast('Could not refresh telemetry.', 'error');
      return null;
    }
  }, [showToast]);

  // Fetch in-app notifications (bell icon)
  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications: n, unreadCount } = await api.get('/notifications');
      setNotifications(n || []);
      setUnreadNotificationCount(unreadCount || 0);
      return { notifications: n, unreadCount };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }, []);

  const markNotificationRead = useCallback(async (notifId) => {
    try {
      await api.patch(`/notifications/${notifId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount((c) => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadNotificationCount(0);
    } catch {
      // silently ignore
    }
  }, []);

  // Hydrate all post-login data in parallel.
  const hydrateUserData = useCallback(
    (user) => {
      const role = user?.role || 'student';
      setUserRole(role);

      // Admins need different data than students/trainees.
      const tasks = [];
      if (['admin', 'university_admin', 'government_admin'].includes(role)) {
        tasks.push(fetchAdminRoster());
        tasks.push(fetchAdminTelemetry());
      } else {
        tasks.push(fetchProfile());
        tasks.push(fetchSkills());
        tasks.push(fetchTargetRoles());
        tasks.push(fetchCourses());
        tasks.push(fetchDrives());
        tasks.push(fetchDocuments());
      }
      // All user types get their in-app notifications
      tasks.push(fetchNotifications());
      return Promise.all(tasks);
    },
    [fetchProfile, fetchSkills, fetchTargetRoles, fetchCourses, fetchDrives, fetchDocuments, fetchAdminRoster, fetchAdminTelemetry, fetchNotifications]
  );

  // ----- Auth actions -----
  const hydrateUser = useCallback(
    (user) => {
      setIsAuthenticated(true);
      setUserRole(user?.role || 'student');
      setAuthMethod('session');
      setIsTransitioning(false);
      const role = user?.role || 'student';
      setActiveTab(['admin', 'university_admin', 'government_admin'].includes(role) ? 'admin-portal' : 'student-dashboard');
      hydrateUserData(user);
    },
    [hydrateUserData]
  );

  // Programmatic login used by AuthView after a successful auth API call.
  const completeLogin = useCallback(
    (user, method = 'password') => {
      setAuthMethod(method);
      hydrateUser(user);
      showToast('Welcome back to Skill-Setu!', 'success');
    },
    [hydrateUser, showToast]
  );

  const handleTransitionComplete = useCallback(() => {
    setIsAuthenticated(true);
    setIsTransitioning(false);
    setActiveTab('student-dashboard');
  }, []);

  const triggerLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the call fails, clear local state — the cookie may already be
      // gone, or the server may be unreachable. Don't trap the user in.
    }
    setIsAuthenticated(false);
    setUserRole(null);
    setProfile(null);
    setSkills([]);
    setTargetRoles([]);
    setSelectedRole(null);
    setCourses([]);
    setCampusDrives([]);
    setAdminRoster([]);
    setAdminTelemetry(null);
    setUploadedFiles([]);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setActiveTab('landing');
    showToast('Signed out from Skill-Setu.', 'info');
  }, [showToast]);

  // ----- Drive application -----
  const applyForDrive = useCallback(
    async (driveId) => {
      try {
        await api.post(`/drives/${driveId}/apply`);
        // Optimistically flip local state; the next drives fetch will refresh
        // the authoritative server values.
        setCampusDrives((prev) =>
          prev.map((d) =>
            d.id === driveId
              ? {
                  ...d,
                  applied: true,
                  appliedDate: new Date().toISOString(),
                  applicationStatus: 'Applied with Skill-Setu Sovereign Passport'
                }
              : d
          )
        );
        showToast('Application successfully submitted with AICTE verified credentials!', 'success');
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Could not submit application. Please try again.';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  // ----- Course enrollment -----
  const toggleCourseEnrollment = useCallback(
    async (courseId) => {
      // Find current course for messaging.
      const course = courses.find((c) => c.id === courseId);
      try {
        const { enrolled } = await api.post(`/courses/${courseId}/enroll`);
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, enrolled, progress: enrolled ? c.progress || 10 : 0 }
              : c
          )
        );
        showToast(
          enrolled
            ? `Enrolled in "${course?.title || 'course'}" via SWAYAM / NPTEL!`
            : `Withdrawn from "${course?.title || 'course'}"`,
          'info'
        );
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Could not change enrollment.';
        showToast(msg, 'error');
      }
    },
    [courses, showToast]
  );

  // Update course progress (used by SkillGapCourses page after enroll).
  const updateCourseProgress = useCallback(
    async (courseId, progress) => {
      try {
        await api.patch(`/courses/${courseId}/progress`, { progress });
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, progress } : c))
        );
      } catch {
        showToast('Could not update progress.', 'error');
      }
    },
    [showToast]
  );

  // ----- Document upload -----
  const uploadDocument = useCallback(
    async (file) => {
      if (!file) return;
      setExtractionInProgress(true);
      setExtractionStep(1);

      // Drive a fake 3-step progress indicator while the upload is in flight —
      // the backend does synchronous parsing so there is no real progress
      // channel; this just gives the user visible feedback.
      const stepTimer = setInterval(() => {
        setExtractionStep((s) => (s < 3 ? s + 1 : s));
      }, 1000);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const { document, newSkillsFound, extractionError } = await api.upload(
          '/documents/upload',
          formData
        );

        // Refresh the local file list and skills list from the server's
        // authoritative response.
        setUploadedFiles((prev) => [normalizeDocument(document), ...prev]);

        if (newSkillsFound > 0) {
          await fetchSkills();
          await fetchProfile();
        }

        showToast(
          extractionError
            ? `Uploaded, but skill extraction failed: ${extractionError}`
            : `Document analyzed! +${newSkillsFound} new skill${
                newSkillsFound === 1 ? '' : 's'
              } credited to your profile.`,
          newSkillsFound > 0 ? 'success' : 'info'
        );
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Upload failed. Please try again.';
        showToast(msg, 'error');
      } finally {
        clearInterval(stepTimer);
        setExtractionInProgress(false);
        setExtractionStep(0);
      }
    },
    [fetchProfile, fetchSkills, showToast]
  );

  // ----- Skill delete -----
  const deleteSkill = useCallback(
    async (skillId) => {
      try {
        await api.delete(`/skills/${skillId}`);
        setSkills((prev) => prev.filter((s) => s.id !== skillId));
        showToast('Skill removed from your dossier.', 'info');
        await fetchProfile();
      } catch {
        showToast('Could not remove skill.', 'error');
      }
    },
    [fetchProfile, showToast]
  );

  // ----- Profile update -----
  const updateProfile = useCallback(
    async (patch) => {
      try {
        const { profile: updated } = await api.patch('/profile/me', patch);
        setProfile(updated);
        showToast('Profile preferences saved successfully.', 'success');
        return updated;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Could not save profile.';
        showToast(msg, 'error');
        return null;
      }
    },
    [showToast]
  );

  const updateSettings = useCallback(
    async (patch) => {
      try {
        const { settings } = await api.patch('/profile/settings', patch);
        setProfile((prev) => (prev ? { ...prev, settings } : prev));
        return settings;
      } catch {
        showToast('Could not update settings.', 'error');
        return null;
      }
    },
    [showToast]
  );

  // ----- Avatar upload / delete -----
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const uploadAvatar = useCallback(
    async (file) => {
      if (!file) return null;
      setIsUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const res = await api.upload('/profile/avatar', formData);
        if (res && res.profile) {
          setProfile(res.profile);
        } else if (res && res.avatarUrl) {
          setProfile((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : prev));
        }
        showToast('Profile picture updated successfully!', 'success');
        return res;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Could not upload profile picture.';
        showToast(msg, 'error');
        return null;
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [showToast]
  );

  const deleteAvatar = useCallback(
    async () => {
      try {
        const res = await api.delete('/profile/avatar');
        if (res && res.profile) {
          setProfile(res.profile);
        } else {
          setProfile((prev) => (prev ? { ...prev, avatarUrl: '' } : prev));
        }
        showToast('Profile picture removed.', 'info');
        return true;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Could not remove profile picture.';
        showToast(msg, 'error');
        return false;
      }
    },
    [showToast]
  );

  // ----- Admin actions -----
  const approveStudentCredentials = useCallback(
    async (studentId) => {
      try {
        await api.post(`/admin/roster/${studentId}/approve`);
        setAdminRoster((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  verificationBadge: 'VERIFIED_SOVEREIGN',
                  placementStatus: 'Verified for Tier-1 Drives'
                }
              : s
          )
        );
        showToast(
          'Student credentials verified and signed with institutional sovereign seal.',
          'success'
        );
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Approval failed.';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  const lookupDossier = useCallback(async (skillSetuId) => {
    try {
      const result = await api.get(`/admin/dossier-lookup/${encodeURIComponent(skillSetuId)}`);
      return result; // { verified, candidate }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { verified: false, message: err.message };
      }
      throw err;
    }
  }, []);

  const refreshAdminTelemetry = useCallback(async () => {
    const t = await fetchAdminTelemetry();
    if (t) {
      showToast('Telemetry refreshed from national registry.', 'success');
    }
    return t;
  }, [fetchAdminTelemetry, showToast]);

  // ----- Loading gate -----
  // ----- Training Programs (admin) -----
  const fetchTrainingPrograms = useCallback(async () => {
    try {
      const { programs } = await api.get('/training-programs');
      return programs;
    } catch (err) {
      showToast('Could not load training programs.', 'error');
      return [];
    }
  }, [showToast]);

  const fetchTrainingProgram = useCallback(async (id) => {
    try {
      const { program } = await api.get(`/training-programs/${id}`);
      return program;
    } catch (err) {
      showToast('Could not load program details.', 'error');
      return null;
    }
  }, [showToast]);

  const runProgramAiAnalysis = useCallback(async (id) => {
    try {
      const result = await api.post(`/training-programs/${id}/ai-analysis`);
      showToast('AI analysis complete.', 'success');
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'AI analysis failed.';
      showToast(msg, 'error');
      return null;
    }
  }, [showToast]);

  // ----- Employment Check-ins (admin + student) -----
  const fetchCheckInSummary = useCallback(async () => {
    try {
      const { summary } = await api.get('/check-ins/admin/summary');
      return summary;
    } catch (err) {
      showToast('Could not load check-in summary.', 'error');
      return null;
    }
  }, [showToast]);

  const fetchAllCheckIns = useCallback(async (filter = {}) => {
    try {
      const params = new URLSearchParams();
      if (filter.cycle) params.set('cycle', filter.cycle);
      if (filter.status) params.set('status', filter.status);
      const qs = params.toString();
      const { checkIns } = await api.get(`/check-ins/admin/all${qs ? `?${qs}` : ''}`);
      return checkIns;
    } catch (err) {
      showToast('Could not load check-ins.', 'error');
      return [];
    }
  }, [showToast]);

  const triggerCheckInCycle = useCallback(async () => {
    try {
      const result = await api.post('/check-ins/admin/run-cycle');
      showToast(`Check-in cycle dispatched: ${result.emailed} emails sent.`, 'success');
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not trigger cycle.';
      showToast(msg, 'error');
      return null;
    }
  }, [showToast]);

  const updateCheckInAdminAction = useCallback(async (checkInId, patch) => {
    try {
      await api.patch(`/check-ins/admin/${checkInId}`, patch);
      showToast('Check-in updated.', 'success');
    } catch (err) {
      showToast('Could not update check-in.', 'error');
    }
  }, [showToast]);

  // Student: respond to a check-in (no auth needed, uses check-in ID as token)
  const respondToCheckIn = useCallback(async (checkInId, payload) => {
    try {
      const { checkIn, message } = await api.patch(`/check-ins/${checkInId}/respond`, payload);
      return { checkIn, message, error: null };
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not submit response.';
      return { checkIn: null, message: null, error: msg };
    }
  }, []);

  const fetchCheckInById = useCallback(async (checkInId) => {
    try {
      const { checkIn } = await api.get(`/check-ins/${checkInId}`);
      return checkIn;
    } catch (err) {
      return null;
    }
  }, []);

  // ----- AI Discovery (student) -----
  const discoverJobs = useCallback(async (location) => {
    try {
      const result = await api.post('/ai/discover-jobs', { location });
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Job discovery failed.';
      showToast(msg, 'error');
      return { jobs: [], error: msg };
    }
  }, [showToast]);

  const discoverCourses = useCallback(async (gapSkills) => {
    try {
      const result = await api.post('/ai/discover-courses', { gapSkills });
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Course discovery failed.';
      showToast(msg, 'error');
      return { courses: [], error: msg };
    }
  }, [showToast]);

  const analyzeTechTrends = useCallback(async () => {
    try {
      const { analysis } = await api.get('/ai/tech-trends');
      return analysis;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Tech trend analysis failed.';
      showToast(msg, 'error');
      return null;
    }
  }, [showToast]);

  const analyzeSkillGap = useCallback(async (payload) => {
    try {
      const result = await api.post('/ai/skill-gap-analysis', payload);
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Skill gap analysis failed.';
      showToast(msg, 'error');
      return { analysis: null, error: msg };
    }
  }, [showToast]);

  // While we probe for an existing session, render a tiny loading splash so

  // the user doesn't see a flash of the landing page before being bounced
  // into the authenticated dashboard.
  if (isAuthBooting) {
    return (
      <AppContext.Provider value={{ isAuthBooting: true }}>
        {children}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider
      value={{
        // Auth & flow
        isAuthenticated,
        isAuthBooting,
        isTransitioning,
        setIsTransitioning,
        authMethod,
        userRole,
        completeLogin,
        handleTransitionComplete,
        triggerLogout,
        // Navigation
        activeTab,
        setActiveTab,
        // Profile & data
        profile,
        setProfile,
        updateProfile,
        updateSettings,
        uploadAvatar,
        deleteAvatar,
        isUploadingAvatar,
        fetchProfile,
        skills,
        setSkills,
        fetchSkills,
        deleteSkill,
        targetRoles,
        fetchTargetRoles,
        fetchAllRoles,
        selectedRole,
        setSelectedRole,
        courses,
        fetchCourses,
        toggleCourseEnrollment,
        updateCourseProgress,
        campusDrives,
        fetchDrives,
        applyForDrive,
        activeJobModal,
        setActiveJobModal,
        adminRoster,
        fetchAdminRoster,
        adminTelemetry,
        fetchAdminTelemetry,
        refreshAdminTelemetry,
        approveStudentCredentials,
        lookupDossier,
        uploadedFiles,
        fetchDocuments,
        extractionInProgress,
        extractionStep,
        uploadDocument,
        // Training programs
        fetchTrainingPrograms,
        fetchTrainingProgram,
        runProgramAiAnalysis,
        // Employment check-ins
        fetchCheckInSummary,
        fetchAllCheckIns,
        triggerCheckInCycle,
        updateCheckInAdminAction,
        respondToCheckIn,
        fetchCheckInById,
        // AI discovery
        discoverJobs,
        discoverCourses,
        analyzeTechTrends,
        analyzeSkillGap,
        // In-app notifications

        notifications,
        unreadNotificationCount,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Normalizes a backend Document record into the shape the UploadExtract UI
// expects. The backend Document model uses `originalName`, `status`, and
// `extractedSkills` (array of strings) — we surface them with display-friendly
// aliases.
function normalizeDocument(doc) {
  if (!doc) return null;
  return {
    id: doc._id || doc.id,
    name: doc.originalName,
    size: formatBytes(doc.sizeBytes || 0),
    uploadDate: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'Just now',
    status: doc.status || 'UPLOADED',
    extractedSkills: doc.extractedSkills || []
  };
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
