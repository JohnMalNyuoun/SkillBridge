import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const PRIMARY = '#139e72';

const DEFAULTS = {
  theme: 'light',
  dataManagement: { lowDataMode: true, offlineSync: false },
  privacy: { profileVisibility: 'Anonymized', allowMentorshipRequests: false },
  notifications: { inAppAlerts: true, smsFallback: true },
};

const THEMES = [
  { value: 'light', label: 'Light', desc: 'Default theme', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', desc: 'Easier on the eyes at night', icon: 'dark_mode' },
  {
    value: 'high-contrast-data-saver',
    label: 'High Contrast / Data Saver',
    desc: 'Maximum readability, minimum bandwidth',
    icon: 'contrast',
  },
];

const VISIBILITY = [
  { value: 'Public', label: 'Public', desc: 'Your name and impact are visible to everyone.' },
  { value: 'Anonymized', label: 'Anonymized', desc: 'Recommended. Only aggregated data is shown.' },
  { value: 'Hidden', label: 'Hidden', desc: 'Only program admins can view your profile.' },
];

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get('/users/me/settings')
      .then(({ data }) => {
        if (!alive) return;
        setSettings(mergeDefaults(data.settings || {}));
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function persist(patch) {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch('/users/me/settings', patch);
      setSettings(mergeDefaults(data.settings));
      setSavedAt(new Date());
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateLocal(path, value) {
    setSettings((prev) => setIn(prev, path, value));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-xl">
        <span className="material-symbols-outlined animate-spin" style={{ color: PRIMARY }}>refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-xl">
        <h2 className="font-headline-lg text-headline-lg mb-xs" style={{ color: PRIMARY }}>Settings & Preferences</h2>
        <p className="text-body-md text-on-surface-variant">
          Tune Fursahub for low-bandwidth use, manage who sees your profile, and choose how you're notified.
        </p>
      </div>

      {error && (
        <div className="mb-md rounded-lg border border-red-200 bg-red-50 text-red-700 px-md py-sm text-body-sm">{error}</div>
      )}
      {saving && <SaveBanner text="Saving…" />}
      {!saving && savedAt && <SaveBanner text={`Saved at ${savedAt.toLocaleTimeString()}`} subtle />}

      <Section
        icon="palette"
        title="Appearance"
        subtitle="Pick a theme. Data Saver disables auto-loading media."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTheme(t.value);
                  updateLocal(['theme'], t.value);
                  setSavedAt(new Date());
                }}
                className={`text-left p-md rounded-xl border-2 transition-all ${
                  active ? 'border-emerald-600 bg-emerald-50' : 'border-outline-variant hover:border-emerald-300'
                }`}
              >
                <span className="material-symbols-outlined text-[24px] mb-xs" style={{ color: active ? PRIMARY : '#6b7280' }}>
                  {t.icon}
                </span>
                <p className={`font-label-md ${active ? 'font-bold' : ''}`} style={{ color: active ? PRIMARY : 'inherit' }}>
                  {t.label}
                </p>
                <p className="text-label-sm text-on-surface-variant mt-xs">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        icon="language"
        title="Language"
        subtitle={`Choose the language for menus, buttons, and on-screen messages. Currently: ${
          (LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]).nativeLabel
        }`}
      >
        <LanguageSwitcher variant="list" />
      </Section>

      <Section
        icon="data_saver_on"
        title="Data Management"
        subtitle="Important for remote regions with limited or expensive mobile data."
      >
        <Toggle
          label="Low Data Mode"
          description="Blocks auto-loading of media evidence (images & video). You can still tap to load each item."
          checked={settings.dataManagement.lowDataMode}
          onChange={(v) => { updateLocal(['dataManagement', 'lowDataMode'], v); persist({ dataManagement: { lowDataMode: v } }); }}
        />
        <Toggle
          label="Offline Sync"
          description="Cache opportunities, stories, and form drafts so you can browse and post while offline."
          checked={settings.dataManagement.offlineSync}
          onChange={(v) => { updateLocal(['dataManagement', 'offlineSync'], v); persist({ dataManagement: { offlineSync: v } }); }}
        />
      </Section>

      <Section
        icon="shield_person"
        title="Privacy"
        subtitle="Control how your profile and impact data appear to others."
      >
        <div className="space-y-sm mb-md">
          {VISIBILITY.map((v) => {
            const active = settings.privacy.profileVisibility === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => {
                  updateLocal(['privacy', 'profileVisibility'], v.value);
                  persist({ privacy: { profileVisibility: v.value } });
                }}
                className={`w-full text-left p-md rounded-xl border-2 flex gap-md items-start transition-all ${
                  active ? 'border-emerald-600 bg-emerald-50' : 'border-outline-variant hover:border-emerald-300'
                }`}
              >
                <span
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? 'border-emerald-600' : 'border-gray-400'}`}
                  style={active ? { backgroundColor: PRIMARY } : {}}
                />
                <div>
                  <p className={`font-label-md ${active ? 'font-bold' : ''}`} style={{ color: active ? PRIMARY : 'inherit' }}>
                    {v.label}
                  </p>
                  <p className="text-label-sm text-on-surface-variant mt-xs">{v.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <Toggle
          label="Allow Mentorship Requests"
          description="Mentors and alumni can reach out to support your journey."
          checked={settings.privacy.allowMentorshipRequests}
          onChange={(v) => {
            updateLocal(['privacy', 'allowMentorshipRequests'], v);
            persist({ privacy: { allowMentorshipRequests: v } });
          }}
        />
      </Section>

      <Section
        icon="notifications"
        title="Notifications"
        subtitle="Stay updated even when your data network is unreliable."
      >
        <Toggle
          label="In-App Alerts"
          description="Bell notifications for likes, comments, and new opportunities."
          checked={settings.notifications.inAppAlerts}
          onChange={(v) => { updateLocal(['notifications', 'inAppAlerts'], v); persist({ notifications: { inAppAlerts: v } }); }}
        />
        <Toggle
          label="SMS Fallback"
          description="Critical alerts (application accepted, urgent deadlines) sent by SMS when data networks drop out."
          checked={settings.notifications.smsFallback}
          onChange={(v) => { updateLocal(['notifications', 'smsFallback'], v); persist({ notifications: { smsFallback: v } }); }}
        />
      </Section>
    </div>
  );
}

function Section({ icon, title, subtitle, children }) {
  return (
    <section className="bg-surface border border-outline-variant rounded-xl p-lg mb-lg">
      <header className="flex items-start gap-md mb-md">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECFDF5', color: PRIMARY }}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <h3 className="font-headline-sm text-headline-sm" style={{ color: PRIMARY }}>{title}</h3>
          {subtitle && <p className="text-body-sm text-on-surface-variant mt-xs">{subtitle}</p>}
        </div>
      </header>
      <div className="space-y-md">{children}</div>
    </section>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-md cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 ${
          checked ? '' : 'bg-gray-300'
        }`}
        style={checked ? { backgroundColor: PRIMARY } : {}}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
      <div>
        <p className="font-label-md text-on-surface">{label}</p>
        {description && <p className="text-label-sm text-on-surface-variant mt-xs">{description}</p>}
      </div>
    </label>
  );
}

function SaveBanner({ text, subtle }) {
  return (
    <div
      className={`mb-md rounded-lg px-md py-xs text-body-sm flex items-center gap-xs ${
        subtle ? 'text-on-surface-variant' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      }`}
    >
      {!subtle && <span className="material-symbols-outlined text-[18px]">cloud_done</span>}
      {text}
    </div>
  );
}

function mergeDefaults(s = {}) {
  return {
    theme: s.theme || DEFAULTS.theme,
    dataManagement: {
      lowDataMode: s.dataManagement?.lowDataMode ?? DEFAULTS.dataManagement.lowDataMode,
      offlineSync: s.dataManagement?.offlineSync ?? DEFAULTS.dataManagement.offlineSync,
    },
    privacy: {
      profileVisibility: s.privacy?.profileVisibility || DEFAULTS.privacy.profileVisibility,
      allowMentorshipRequests: s.privacy?.allowMentorshipRequests ?? DEFAULTS.privacy.allowMentorshipRequests,
    },
    notifications: {
      inAppAlerts: s.notifications?.inAppAlerts ?? DEFAULTS.notifications.inAppAlerts,
      smsFallback: s.notifications?.smsFallback ?? DEFAULTS.notifications.smsFallback,
    },
  };
}

function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  return { ...obj, [head]: setIn(obj?.[head] ?? {}, rest, value) };
}
