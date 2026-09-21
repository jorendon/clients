import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export const LANG_STORAGE_KEY = 'clients-lang';
export const SUPPORTED_LANGS = ['es', 'en'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

const isTest = import.meta.env.MODE === 'test';

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { es: { translation: es }, en: { translation: en } },
      // En tests fijamos español para assertions deterministas
      lng: isTest ? 'es' : undefined,
      fallbackLng: 'es',
      supportedLngs: [...SUPPORTED_LANGS],
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LANG_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });
}

export function setAppLanguage(lang: AppLang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  return i18n.changeLanguage(lang);
}

export function getAppLanguage(): AppLang {
  return (i18n.language?.startsWith('en') ? 'en' : 'es') as AppLang;
}

document.documentElement.lang = getAppLanguage();

export default i18n;
