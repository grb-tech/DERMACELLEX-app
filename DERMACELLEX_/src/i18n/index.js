/**
 * DERMACELLEX i18n Engine
 * Lightweight, zero-dependency internationalization
 * Phase 2 — 15 languages
 */

const SUPPORTED_LOCALES = [
  { code: 'ko',    name: '한국어',     nameEn: 'Korean',     dir: 'ltr', flag: '🇰🇷' },
  { code: 'en',    name: 'English',    nameEn: 'English',    dir: 'ltr', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文',    nameEn: 'Chinese',    dir: 'ltr', flag: '🇨🇳' },
  { code: 'ja',    name: '日本語',      nameEn: 'Japanese',   dir: 'ltr', flag: '🇯🇵' },
  { code: 'vi',    name: 'Tiếng Việt', nameEn: 'Vietnamese', dir: 'ltr', flag: '🇻🇳' },
  { code: 'th',    name: 'ไทย',        nameEn: 'Thai',       dir: 'ltr', flag: '🇹🇭' },
  { code: 'es',    name: 'Español',    nameEn: 'Spanish',    dir: 'ltr', flag: '🇪🇸' },
  { code: 'fr',    name: 'Français',   nameEn: 'French',     dir: 'ltr', flag: '🇫🇷' },
  { code: 'de',    name: 'Deutsch',    nameEn: 'German',     dir: 'ltr', flag: '🇩🇪' },
  { code: 'pt-BR', name: 'Português',  nameEn: 'Portuguese', dir: 'ltr', flag: '🇧🇷' },
  { code: 'id',    name: 'Bahasa Indonesia', nameEn: 'Indonesian', dir: 'ltr', flag: '🇮🇩' },
  { code: 'ar',    name: 'العربية',     nameEn: 'Arabic',     dir: 'rtl', flag: '🇸🇦' },
  { code: 'ru',    name: 'Русский',    nameEn: 'Russian',    dir: 'ltr', flag: '🇷🇺' },
  { code: 'ms',    name: 'Bahasa Melayu', nameEn: 'Malay',   dir: 'ltr', flag: '🇲🇾' },
  { code: 'hi',    name: 'हिन्दी',       nameEn: 'Hindi',      dir: 'ltr', flag: '🇮🇳' },
];

const DEFAULT_LOCALE = 'ko';
const STORAGE_KEY = 'dcx-locale';

let currentLocale = DEFAULT_LOCALE;
let translations = {};
let listeners = new Set();

/** Detect browser language → best match */
function detectLocale() {
  const stored = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.find(l => l.code === stored)) return stored;

  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages || [navigator.language];
    for (const lang of langs) {
      const exact = SUPPORTED_LOCALES.find(l => l.code === lang);
      if (exact) return exact.code;
      const prefix = lang.split('-')[0];
      const partial = SUPPORTED_LOCALES.find(l => l.code.startsWith(prefix));
      if (partial) return partial.code;
    }
  }
  return DEFAULT_LOCALE;
}

/** Load a locale's translation file */
async function loadLocale(code) {
  if (translations[code]) return translations[code];
  try {
    const mod = await import(`./locales/${code}.json`);
    translations[code] = mod.default || mod;
    return translations[code];
  } catch (e) {
    console.warn(`[i18n] Failed to load locale: ${code}, falling back to ${DEFAULT_LOCALE}`);
    if (code !== DEFAULT_LOCALE) return loadLocale(DEFAULT_LOCALE);
    return {};
  }
}

/** Get nested value by dot-path: t('intro.title') */
function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

/** Main translate function */
function t(key, params = {}) {
  const dict = translations[currentLocale] || translations[DEFAULT_LOCALE] || {};
  let val = getByPath(dict, key);

  // Fallback to default locale
  if (val === null && currentLocale !== DEFAULT_LOCALE) {
    const fallback = translations[DEFAULT_LOCALE] || {};
    val = getByPath(fallback, key);
  }

  if (val === null) return `[${key}]`;

  // Interpolation: "안녕하세요, {{name}}님" → params.name
  if (typeof val === 'string' && params) {
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`);
  }
  return val;
}

/** Set locale and notify */
async function setLocale(code) {
  const locale = SUPPORTED_LOCALES.find(l => l.code === code);
  if (!locale) return;

  await loadLocale(code);
  currentLocale = code;

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, code);
  }

  // Set dir for RTL
  if (typeof document !== 'undefined') {
    document.documentElement.dir = locale.dir;
    document.documentElement.lang = code;
  }

  listeners.forEach(fn => fn(code));
}

/** Subscribe to locale changes */
function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getLocale() { return currentLocale; }
function getLocaleInfo() { return SUPPORTED_LOCALES.find(l => l.code === currentLocale); }
function getDir() { return getLocaleInfo()?.dir || 'ltr'; }

/** Initialize — call once at app boot */
async function init(forceLocale) {
  const code = forceLocale || detectLocale();
  // Preload default locale for fallback
  await loadLocale(DEFAULT_LOCALE);
  await setLocale(code);
}

export {
  t,
  init,
  setLocale,
  getLocale,
  getLocaleInfo,
  getDir,
  onLocaleChange,
  detectLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
};

export default { t, init, setLocale, getLocale, getLocaleInfo, getDir, onLocaleChange, SUPPORTED_LOCALES };
