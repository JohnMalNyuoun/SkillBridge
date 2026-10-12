import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { t, isRTL } from '../i18n/i18n';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  const { language, setLanguage, isLoading } = context;

  return {
    language,
    setLanguage,
    t: (key) => t(language, key),
    isRTL: isRTL(language),
    isLoading,
  };
};
