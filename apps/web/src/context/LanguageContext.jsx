import { createContext, useContext, useState } from 'react';
import en from '../i18n/en.json';
import ne from '../i18n/ne.json';

const STORAGE_KEY = 'sajilo-language';
const DICTIONARIES = { en, ne };

// Lightweight in-house i18n rather than a library: a flat key->string JSON
// dictionary per language and a t(key) lookup. Covers static UI chrome
// (nav, hamburger menu, common labels) only - admin-controlled dynamic
// content (service/category names, announcements, etc.) has no dictionary
// entries and always renders in whatever the admin typed.
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  function setLanguage(next) {
    localStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
  }

  function t(key) {
    return DICTIONARIES[language]?.[key] ?? DICTIONARIES.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
