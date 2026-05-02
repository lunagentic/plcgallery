import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { ko } from './ko';
import { en } from './en';

export const resources = {
  ko: { translation: ko },
  en: { translation: en },
} as const;

export type SupportedLang = keyof typeof resources;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    supportedLngs: ['ko', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'plc-lang',
    },
    react: { useSuspense: false },
  });

export default i18n;
