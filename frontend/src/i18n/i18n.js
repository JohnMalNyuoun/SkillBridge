import en from './translations/en.json';
import sw from './translations/sw.json';
import fr from './translations/fr.json';
import ar from './translations/ar.json';

const translations = {
  en,
  sw,
  fr,
  ar,
};

export const getTranslation = (language, key) => {
  const keys = key.split('.');
  let value = translations[language] || translations.en;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  return value || key;
};

export const t = (language, key) => {
  return getTranslation(language, key);
};

export const setHtmlDirection = (language) => {
  if (language === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = language;
  }
};

export const isRTL = (language) => {
  return language === 'ar';
};

export default translations;
