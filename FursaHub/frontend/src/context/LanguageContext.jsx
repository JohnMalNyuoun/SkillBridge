import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'fursahub_lang';

export const LANGUAGES = [
  { code: 'en', label: 'English',   nativeLabel: 'English',   flag: '🇬🇧', dir: 'ltr' },
  { code: 'sw', label: 'Swahili',   nativeLabel: 'Kiswahili', flag: '🇰🇪', dir: 'ltr' },
  { code: 'fr', label: 'French',    nativeLabel: 'Français',  flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', label: 'Arabic',    nativeLabel: 'العربية',   flag: '🇸🇦', dir: 'rtl' },
];

// Translation dictionary. Add keys as you translate more screens.
// Falls back to English when a key/locale is missing.
const dict = {
  en: {
    'app.tagline': 'Educational Access',
    'nav.dashboard': 'Dashboard',
    'nav.opportunities': 'Opportunities',
    'nav.inspire': 'Inspire',
    'nav.beneficiaries': 'Beneficiaries',
    'nav.myOrgPage': 'My Org Page',
    'nav.settings': 'Settings',
    'nav.exploreCourses': 'Explore Courses',
    'nav.myLearning': 'My Learning',
    'nav.myProfile': 'My Profile',
    'action.postOpportunity': 'Post Opportunity',
    'action.enrollNow': 'Enroll Now',
    'action.signOut': 'Sign out',
    'action.viewProfile': 'View profile',
    'action.search': 'Search...',
    'settings.title': 'Settings & Preferences',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose the language for menus, buttons, and on-screen messages.',
    'settings.savedAt': 'Saved at',
    'settings.saving': 'Saving…',
  },
  sw: {
    'app.tagline': 'Upatikanaji wa Elimu',
    'nav.dashboard': 'Dashibodi',
    'nav.opportunities': 'Fursa',
    'nav.inspire': 'Hamasisha',
    'nav.beneficiaries': 'Wanufaika',
    'nav.myOrgPage': 'Ukurasa wa Shirika',
    'nav.settings': 'Mipangilio',
    'nav.exploreCourses': 'Chunguza Kozi',
    'nav.myLearning': 'Masomo Yangu',
    'nav.myProfile': 'Wasifu Wangu',
    'action.postOpportunity': 'Chapisha Fursa',
    'action.enrollNow': 'Jisajili Sasa',
    'action.signOut': 'Toka',
    'action.viewProfile': 'Tazama wasifu',
    'action.search': 'Tafuta...',
    'settings.title': 'Mipangilio na Mapendeleo',
    'settings.appearance': 'Mwonekano',
    'settings.language': 'Lugha',
    'settings.languageDesc': 'Chagua lugha ya menyu, vitufe na ujumbe wa skrini.',
    'settings.savedAt': 'Imehifadhiwa saa',
    'settings.saving': 'Inahifadhi…',
  },
  fr: {
    'app.tagline': 'Accès à l’éducation',
    'nav.dashboard': 'Tableau de bord',
    'nav.opportunities': 'Opportunités',
    'nav.inspire': 'Inspirer',
    'nav.beneficiaries': 'Bénéficiaires',
    'nav.myOrgPage': 'Ma page d’organisation',
    'nav.settings': 'Paramètres',
    'nav.exploreCourses': 'Explorer les cours',
    'nav.myLearning': 'Mon apprentissage',
    'nav.myProfile': 'Mon profil',
    'action.postOpportunity': 'Publier une opportunité',
    'action.enrollNow': 'S’inscrire',
    'action.signOut': 'Se déconnecter',
    'action.viewProfile': 'Voir le profil',
    'action.search': 'Rechercher...',
    'settings.title': 'Paramètres et préférences',
    'settings.appearance': 'Apparence',
    'settings.language': 'Langue',
    'settings.languageDesc': 'Choisissez la langue des menus, boutons et messages.',
    'settings.savedAt': 'Enregistré à',
    'settings.saving': 'Enregistrement…',
  },
  ar: {
    'app.tagline': 'الوصول إلى التعليم',
    'nav.dashboard': 'لوحة التحكم',
    'nav.opportunities': 'الفرص',
    'nav.inspire': 'ألهم',
    'nav.beneficiaries': 'المستفيدون',
    'nav.myOrgPage': 'صفحة منظمتي',
    'nav.settings': 'الإعدادات',
    'nav.exploreCourses': 'استكشف الدورات',
    'nav.myLearning': 'تعلمي',
    'nav.myProfile': 'ملفي الشخصي',
    'action.postOpportunity': 'نشر فرصة',
    'action.enrollNow': 'سجل الآن',
    'action.signOut': 'تسجيل الخروج',
    'action.viewProfile': 'عرض الملف الشخصي',
    'action.search': 'بحث...',
    'settings.title': 'الإعدادات والتفضيلات',
    'settings.appearance': 'المظهر',
    'settings.language': 'اللغة',
    'settings.languageDesc': 'اختر لغة القوائم والأزرار والرسائل.',
    'settings.savedAt': 'تم الحفظ في',
    'settings.saving': 'جاري الحفظ…',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  dir: 'ltr',
});

function detectInitial() {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === nav) ? nav : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitial);

  const setLanguage = useCallback((code) => {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    setLanguageState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const meta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }, [meta]);

  const t = useCallback(
    (key, fallback) => {
      const v = dict[language]?.[key];
      if (v != null) return v;
      const en = dict.en?.[key];
      if (en != null) return en;
      return fallback ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, dir: meta.dir, languages: LANGUAGES }),
    [language, setLanguage, t, meta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}
