import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const {
    activeTab,
    setActiveTab,
    profile,
    triggerLogout,
    userRole,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    fetchNotifications
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const navItems = [
    { id: 'student-dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'upload-and-extract', label: 'Upload & Extract', icon: 'document_scanner' },
    { id: 'job-matching', label: 'Job Opportunities', icon: 'work' },
    { id: 'skill-gap-and-courses', label: 'Courses & Skills', icon: 'auto_graph' }
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Refresh notifications when bell is opened
  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      fetchNotifications && fetchNotifications();
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.readAt) {
      markNotificationRead && markNotificationRead(notif._id);
    }
    if (notif.link) {
      const link = notif.link;
      if (link.startsWith('#/')) {
        // Hash-based route
        window.location.hash = link.slice(1);
      } else if (link.startsWith('http')) {
        window.open(link, '_blank');
      } else {
        // Internal tab ID
        setActiveTab(link);
      }
    }
    setNotifOpen(false);
  };

  const recentNotifs = (notifications || []).slice(0, 8);

  return (
    <header className="site-header">
      <div
        className="layout-container"
        style={{
          height: '4.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem'
        }}
      >
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <BrandLogo
            variant="compact"
            onClick={() => setActiveTab('student-dashboard')}
          />
        </div>

        {/* Center: Desktop Navigation */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.25rem',
            overflowX: 'auto',
            padding: '0.25rem 0'
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`civic-nav-link ${isActive ? 'active' : ''}`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    color: isActive ? '#1976A8' : '#64748B'
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Notification Bell + Profile + Mobile Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>

          {/* --- Notification Bell --- */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              id="notification-bell"
              onClick={handleBellClick}
              aria-label={`Notifications ${unreadNotificationCount > 0 ? `(${unreadNotificationCount} unread)` : ''}`}
              title="Notifications"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: notifOpen ? '#E8F4FC' : '#F8FAFC',
                border: `1px solid ${notifOpen ? '#1976A8' : '#E2E8F0'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: notifOpen ? '#1976A8' : '#475569' }}
              >
                notifications
              </span>
              {unreadNotificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9999px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                    border: '2px solid #FFFFFF'
                  }}
                >
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  width: '360px',
                  maxWidth: 'calc(100vw - 2rem)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 50,
                  overflow: 'hidden'
                }}
              >
                {/* Panel Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1rem 0.75rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1976A8' }}>
                      notifications
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Notifications
                    </span>
                    {unreadNotificationCount > 0 && (
                      <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                        {unreadNotificationCount} new
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead && markAllNotificationsRead()}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.72rem',
                        color: '#1976A8',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '0.2rem 0.35rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {recentNotifs.length === 0 ? (
                    <div
                      style={{
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem'
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '36px', color: '#CBD5E1', display: 'block', marginBottom: '0.5rem' }}
                      >
                        notifications_none
                      </span>
                      No notifications yet
                    </div>
                  ) : (
                    recentNotifs.map((notif) => {
                      const isUnread = !notif.readAt;
                      return (
                        <button
                          key={notif._id}
                          onClick={() => handleNotifClick(notif)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.85rem 1rem',
                            background: isUnread ? '#F0F7FF' : '#FFFFFF',
                            border: 'none',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.12s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#E8F4FC')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? '#F0F7FF' : '#FFFFFF')}
                        >
                          {/* Icon */}
                          <div
                            style={{
                              flexShrink: 0,
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: isUnread ? '#DBEAFE' : '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: '2px'
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '17px', color: isUnread ? '#1976A8' : '#64748B' }}
                            >
                              {notif.channels?.includes('whatsapp')
                                ? 'chat'
                                : notif.channels?.includes('email')
                                ? 'mail'
                                : 'campaign'}
                            </span>
                          </div>
                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: isUnread ? 700 : 500,
                                color: 'var(--text-main)',
                                lineHeight: 1.3,
                                marginBottom: '0.2rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notif.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.76rem',
                                color: 'var(--text-muted)',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {notif.message}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-light)', marginTop: '0.3rem' }}>
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}
                            </div>
                          </div>
                          {/* Unread dot */}
                          {isUnread && (
                            <div
                              style={{
                                flexShrink: 0,
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#1976A8',
                                marginTop: '6px'
                              }}
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* --- Profile Avatar Dropdown --- */}
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.35rem 0.65rem 0.35rem 0.75rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Open student profile menu"
            >
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>
                  {profile?.name || 'Loading…'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#15803D' }}>
                  Skill Set Verified
                </span>
              </div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#102A43',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1.5px solid var(--border-medium)'
                }}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name || 'User'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    person
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                {profileMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  minWidth: '220px',
                  padding: '0.4rem',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20
                }}
              >
                <div
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#102A43',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name || 'User'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        person
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {profile?.name || 'Candidate'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {profile?.email || profile?.phone || 'Verified Identity'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('user-id');
                    setProfileMenuOpen(false);
                  }}
                  className="civic-nav-link"
                  role="menuitem"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 0.75rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>badge</span>
                  <span>Profile &amp; Documents</span>
                </button>
                {['admin', 'university_admin', 'government_admin'].includes(userRole) && (
                  <button
                    onClick={() => {
                      setActiveTab('placement-cell-admin');
                      setProfileMenuOpen(false);
                    }}
                    className="civic-nav-link"
                    role="menuitem"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 0.75rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>analytics</span>
                    <span>Admin Portal</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    triggerLogout();
                  }}
                  className="civic-nav-link"
                  role="menuitem"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 0.75rem', color: 'var(--danger)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--danger)' }}>logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-nav-toggle btn-secondary btn-sm"
            style={{ display: 'none', padding: '0.45rem 0.6rem' }}
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: '1px solid #E2E8F0',
            background: '#FFFFFF',
            padding: '0.75rem 1rem 1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`civic-nav-link ${isActive ? 'active' : ''}`}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.65rem 0.85rem'
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '18px',
                    color: isActive ? '#1976A8' : '#64748B'
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {['admin', 'university_admin', 'government_admin'].includes(userRole) && (
            <button
              onClick={() => {
                setActiveTab('placement-cell-admin');
                setMobileMenuOpen(false);
              }}
              className={`civic-nav-link ${activeTab === 'placement-cell-admin' ? 'active' : ''}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '0.65rem 0.85rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1976A8' }}>
                analytics
              </span>
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 1080px) {
          .desktop-nav {
            display: flex !important;
          }
        }
        @media (max-width: 1079px) {
          .mobile-nav-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
