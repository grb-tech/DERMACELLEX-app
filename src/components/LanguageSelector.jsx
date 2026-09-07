import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';

/**
 * LanguageSelector
 * 
 * Two modes:
 *   - compact: flag + code button that opens the full selector
 *   - inline:  renders the full list directly (for settings page)
 * 
 * Usage:
 *   <LanguageSelector />                    // compact (default)
 *   <LanguageSelector mode="inline" />      // inline list
 */
export default function LanguageSelector({ mode = 'compact' }) {
  const { locale, setLocale, locales, t } = useI18n();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef(null);

  const current = locales.find(l => l.code === locale);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = async (code) => {
    await setLocale(code);
    setOpen(false);
  };

  // ── Inline mode ──
  if (mode === 'inline') {
    return (
      <div className="dcx-lang-grid" role="radiogroup" aria-label={t('common.langLabel')}>
        {locales.map(l => (
          <button
            key={l.code}
            className={`dcx-lang-item ${l.code === locale ? 'dcx-lang-active' : ''}`}
            onClick={() => handleSelect(l.code)}
            role="radio"
            aria-checked={l.code === locale}
          >
            <span className="dcx-lang-flag">{l.flag}</span>
            <span className="dcx-lang-name">{l.name}</span>
            {l.code === locale && <span className="dcx-lang-check">✓</span>}
          </button>
        ))}
      </div>
    );
  }

  // ── Compact mode ──
  return (
    <>
      <button
        className="dcx-lang-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t('common.langLabel')}: ${current?.name}`}
      >
        <span>{current?.flag}</span>
        <span className="dcx-lang-code">{locale.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="dcx-lang-overlay"
          ref={overlayRef}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('common.langLabel')}
        >
          <div className="dcx-lang-sheet" dir="ltr">
            <div className="dcx-lang-sheet-header">
              <h3>{t('common.langLabel')}</h3>
              <button className="dcx-lang-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="dcx-lang-sheet-body">
              {locales.map(l => (
                <button
                  key={l.code}
                  className={`dcx-lang-option ${l.code === locale ? 'dcx-lang-option-active' : ''}`}
                  onClick={() => handleSelect(l.code)}
                >
                  <span className="dcx-lang-flag">{l.flag}</span>
                  <div className="dcx-lang-label">
                    <span className="dcx-lang-native">{l.name}</span>
                    {l.nameEn !== l.name && (
                      <span className="dcx-lang-en">{l.nameEn}</span>
                    )}
                  </div>
                  {l.code === locale && (
                    <span className="dcx-lang-selected-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
