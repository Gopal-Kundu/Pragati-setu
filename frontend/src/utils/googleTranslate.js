/**
 * Cookie Utilities and Programmatic Language Switcher using Google Translate Engine
 */

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const setCookie = (name, value, days = 365) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const hostname = window.location.hostname;
  
  // Set for current path and root
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  if (hostname && hostname !== 'localhost') {
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; domain=${hostname}; path=/; SameSite=Lax`;
    if (hostname.includes('.')) {
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; domain=.${hostname}; path=/; SameSite=Lax`;
    }
  }
};

/**
 * Retrieve user's selected language from cookies
 * Checks 'app_lang' first, then 'googtrans'
 */
export const getSelectedLanguageFromCookie = () => {
  if (typeof document === 'undefined') return 'en';
  
  const appLang = getCookie('app_lang');
  if (appLang) return appLang;

  const googTrans = getCookie('googtrans');
  if (googTrans) {
    const parts = googTrans.split('/');
    if (parts.length >= 3 && parts[2]) {
      return parts[2];
    }
  }

  return 'en';
};

/**
 * Programmatically switch language using Google Translate Engine
 * Sets both app_lang and googtrans cookies and triggers DOM dropdown if present
 * @param {string} langCode - Language code (e.g. 'en', 'hi', 'bn', 'te', 'sat')
 */
export const changeGoogleLanguage = (langCode) => {
  try {
    const targetLang = langCode || 'en';

    // 1. Store chosen language in 'app_lang' cookie
    setCookie('app_lang', targetLang);

    const hostname = window.location.hostname;
    const expires = new Date(Date.now() + 365 * 864e5).toUTCString();

    if (targetLang === 'en') {
      // Clear translation cookies for English
      const past = 'Thu, 01 Jan 1970 00:00:00 UTC';
      document.cookie = `googtrans=; expires=${past}; path=/;`;
      document.cookie = `googtrans=/en/en; expires=${expires}; path=/;`;
      if (hostname && hostname !== 'localhost') {
        document.cookie = `googtrans=; expires=${past}; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=; expires=${past}; domain=.${hostname}; path=/;`;
      }
    } else {
      // Set Google Translate standard cookies
      document.cookie = `googtrans=/en/${targetLang}; expires=${expires}; path=/;`;
      document.cookie = `googtrans=/auto/${targetLang}; expires=${expires}; path=/;`;
      if (hostname && hostname !== 'localhost') {
        document.cookie = `googtrans=/en/${targetLang}; expires=${expires}; domain=${hostname}; path=/;`;
        if (hostname.includes('.')) {
          document.cookie = `googtrans=/en/${targetLang}; expires=${expires}; domain=.${hostname}; path=/;`;
        }
      }
    }

    // 2. Change Google Translate combo dropdown if already initialized in DOM
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = targetLang;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch (err) {
    console.warn('[Google Translate Engine Error]:', err);
  }
};

export default changeGoogleLanguage;
