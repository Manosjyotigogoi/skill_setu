import React from 'react';

/**
 * Skill-Setu (Skill-सेतु) Brand Logo
 * Faithfully matches the user's reference image:
 * - Upper and lower saffron (#D9822B) brackets
 * - "Skill-सेतु" bilingual typography
 * - Hindi motto: "जहाँ हुनर मिले अवसर से"
 * - English subtitle: "WHERE SKILL MEETS OPPORTUNITY"
 */
export default function BrandLogo({ variant = 'header', onClick }) {
  const isDisplay = variant === 'display';
  const isCompact = variant === 'compact';

  return (
    <div
      onClick={onClick}
      className={`brand-bracket-container ${isDisplay ? 'brand-logo-display' : isCompact ? 'brand-logo-compact' : ''}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Saffron Bracket Enclosure */}
      <div style={{ width: isDisplay ? '380px' : isCompact ? '160px' : '220px', maxWidth: '100%' }}>
        {/* Top Saffron Bracket with vertical tick edges */}
        <div
          style={{
            width: '100%',
            height: isDisplay ? '14px' : '7px',
            borderTop: `${isDisplay ? '3.5px' : '2px'} solid #D9822B`,
            borderLeft: `${isDisplay ? '3.5px' : '2px'} solid #D9822B`,
            borderRight: `${isDisplay ? '3.5px' : '2px'} solid #D9822B`,
            marginBottom: isDisplay ? '4px' : '2px'
          }}
        />

        {/* Center Bilingual Title: Skill-सेतु */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isDisplay ? '6px' : '3px',
            padding: isDisplay ? '4px 12px' : '1px 6px'
          }}
        >
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontSize: isDisplay ? '3.2rem' : isCompact ? '1.2rem' : '1.55rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#17324D',
              lineHeight: 1
            }}
          >
            Skill-
          </span>
          <span
            style={{
              fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif",
              fontSize: isDisplay ? '3.2rem' : isCompact ? '1.2rem' : '1.55rem',
              fontWeight: 700,
              color: '#1976A8',
              letterSpacing: '0.01em',
              lineHeight: 1
            }}
          >
            सेतु
          </span>
        </div>

        {/* Bottom Saffron Divider Line */}
        <div
          style={{
            width: '100%',
            height: isDisplay ? '3.5px' : '2px',
            backgroundColor: '#D9822B',
            marginTop: isDisplay ? '4px' : '2px',
            marginBottom: isDisplay ? '8px' : '4px'
          }}
        />
      </div>

      {/* Bilingual Tagline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isDisplay ? '3px' : '1px'
        }}
      >
        <span
          style={{
            fontFamily: "'Noto Sans Devanagari', sans-serif",
            fontSize: isDisplay ? '1.15rem' : isCompact ? '0.62rem' : '0.74rem',
            fontWeight: 500,
            color: '#526475',
            letterSpacing: '0.01em',
            lineHeight: 1.2
          }}
        >
          जहाँ हुनर मिले अवसर से
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            fontSize: isDisplay ? '0.78rem' : isCompact ? '0.52rem' : '0.58rem',
            fontWeight: 700,
            color: '#7B8A99',
            letterSpacing: isDisplay ? '0.12em' : '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1.2
          }}
        >
          WHERE SKILL MEETS OPPORTUNITY
        </span>
      </div>
    </div>
  );
}
