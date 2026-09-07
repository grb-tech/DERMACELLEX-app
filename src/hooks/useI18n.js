import { useState, useEffect, useCallback } from 'react';
import { t, setLocale, getLocale, getLocaleInfo, getDir, onLocaleChange, SUPPORTED_LOCALES } from '../i18n';

/**
 * React hook for i18n
 * 
 * Usage:
 *   const { t, locale, setLocale, dir, localeInfo, locales } = useI18n();
 *   return <h1>{t('intro.title')}</h1>;
 */
export function useI18n() {
  const [locale, _setLocale] = useState(getLocale());

  useEffect(() => {
    return onLocaleChange((code) => _setLocale(code));
  }, []);

  const changeLocale = useCallback(async (code) => {
    await setLocale(code);
  }, []);

  return {
    t,
    locale,
    setLocale: changeLocale,
    dir: getDir(),
    localeInfo: getLocaleInfo(),
    locales: SUPPORTED_LOCALES,
  };
}

export default useI18n;
