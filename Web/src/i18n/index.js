import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hin from './hin.json';

function getSavedLang() {
  try {
    // Zustand persist wraps state as { state: { lang: '...' } }
    const raw = localStorage.getItem('hk-lang-pref');
    return JSON.parse(raw)?.state?.lang || 'en';
  } catch {
    return 'en';
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:  { translation: en },
      hin: { translation: hin },
    },
    lng: getSavedLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    // In-memory resources load synchronously — no Suspense needed
    react: { useSuspense: false },
  });

export default i18n;
