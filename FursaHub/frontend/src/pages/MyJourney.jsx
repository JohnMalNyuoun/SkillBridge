import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function MyJourney() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/impact/me')
      .then(({ data }) => setRecords(data.items || []))
      .finally(() => setLoading(false));
  }, []);

  const grad = user?.profile?.graduationDate ? new Date(user.profile.graduationDate) : null;
  const milestones = [
    { key: 'applicant', title: 'Applicant', subtitle: 'Application Accepted', date: user?.createdAt, icon: 'check', state: 'done' },
    { key: 'enrolled', title: 'Enrolled', subtitle: user?.profile?.program || 'Enrolled in program', date: user?.createdAt, icon: 'check', state: 'done' },
    { key: 'graduate', title: 'Graduate', subtitle: 'Certification Issued', date: grad, icon: 'school', state: grad && grad < new Date() ? 'done' : 'pending' },
    { key: 'impact', title: 'Impact Phase', subtitle: 'Livelihood Tracking', date: null, icon: 'monitoring', state: 'active' },
  ];

  const latestImpact = records[records.length - 1];
  const pendingPrompt = records.find((r) => r.followUp?.promptSentAt && !r.followUp?.respondedAt);

  return (
    <>
      <div className="mb-xl flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">My Journey</h2>
          <p className="text-body-md text-on-surface-variant max-w-xl">
            Track your progress from a curious applicant to a professional making a real-world impact.
          </p>
        </div>
        <div className="flex gap-sm">
          <span className="px-md py-xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            {(user?.profile?.program || 'Fursahub').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-lg">
        <section className="col-span-12 lg:col-span-4 bg-surface border border-outline-variant rounded-xl p-lg h-fit">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-xl">Milestones</h3>
          <div className="relative space-y-xxl">
            {milestones.map((m, i) => {
              const last = i === milestones.length - 1;
              const colorClass =
                m.state === 'active' ? 'bg-primary text-on-primary pulse-active'
                : m.state === 'done' ? 'bg-secondary text-on-secondary'
                : 'bg-surface-variant text-on-surface-variant';
              const lineClass =
                m.state === 'done' ? 'bg-secondary' : 'timeline-line';
              return (
                <div key={m.key} className="flex gap-lg relative z-10">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center border-4 border-white`}>
                      <span className="material-symbols-outlined filled text-[20px]">{m.icon}</span>
                    </div>
                    {!last && <div className={`w-1 h-24 ${lineClass} mt-xs`} />}
                  </div>
                  <div>
                    <h4 className={`font-label-md uppercase ${m.state === 'active' ? 'text-primary' : 'text-secondary'}`}>{m.title}</h4>
                    <p className="text-body-sm text-on-surface font-semibold">{m.subtitle}</p>
                    {m.date && (
                      <p className="text-label-sm text-outline mt-xs">{new Date(m.date).toLocaleDateString()}</p>
                    )}
                    {m.state === 'active' && (
                      <p className="text-label-sm text-outline mt-xs">Status: Active</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="col-span-12 lg:col-span-8 space-y-lg">
          {(pendingPrompt || records.length === 0) && (
            <div className="bg-tertiary-fixed text-tertiary-container border border-tertiary-container/20 rounded-xl p-lg flex items-start gap-lg relative overflow-hidden group">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-tertiary-container/5 rounded-full blur-3xl group-hover:bg-tertiary-container/10 transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-tertiary-container text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">campaign</span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline-sm text-headline-sm mb-xs">Action Required: Impact Reporting</h3>
                <p className="text-body-md mb-lg">
                  Share your latest professional links or business photos to help track program success and unlock alumni perks.
                </p>
                <div className="flex gap-md">
                  <ImpactSubmit onDone={() => api.get('/impact/me').then(({ data }) => setRecords(data.items || []))} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <section className="bg-surface border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-md mb-xl">
                <span className="material-symbols-outlined text-primary">terminal</span>
                <h3 className="font-headline-sm text-headline-sm text-primary">Professional Profile</h3>
              </div>
              <div className="space-y-lg">
                <ProfileField icon="link" label="LinkedIn URL" placeholder="linkedin.com/in/you" />
                <ProfileField icon="code" label="GitHub Username" placeholder="Enter username" />
                <ProfileField icon="work" label="Upwork Profile" placeholder="Link to profile" />
              </div>
            </section>

            <section className="border border-secondary/20 rounded-xl p-lg" style={{ backgroundColor: '#E1F5EE' }}>
              <div className="flex items-center gap-md mb-xl">
                <span className="material-symbols-outlined text-secondary">storefront</span>
                <h3 className="font-headline-sm text-headline-sm text-secondary">Business Showcase</h3>
              </div>
              <BusinessShowcase />
            </section>
          </div>

          <section className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="flex items-center justify-between mb-xl">
              <h3 className="font-headline-sm text-headline-sm text-primary">Your Progress Data</h3>
              <button className="text-primary font-label-md flex items-center gap-xs">
                View Full Report <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
              <ProgressTile label="Course Grade" value="—" caption="Pending grading" color="secondary" bar={0} />
              <ProgressTile
                label="Employment Status"
                value={latestImpact?.employmentStatus?.replace(/_/g, ' ') || 'Not reported'}
                caption={latestImpact ? `Updated ${new Date(latestImpact.checkpointDate).toLocaleDateString()}` : 'Submit your first impact report'}
                color="primary"
              />
              <ProgressTile
                label="Livelihood Impact"
                value={records.length ? 'Active' : 'Pending'}
                caption={loading ? 'Loading…' : `${records.length} records`}
                color="primary"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function ProfileField({ icon, label, placeholder, value }) {
  return (
    <div>
      <label className="block font-label-sm text-outline mb-xs uppercase">{label}</label>
      <div className="flex items-center border border-outline-variant rounded-lg bg-background p-sm focus-within:ring-2 focus-within:ring-primary transition-all">
        <span className="material-symbols-outlined text-[20px] text-outline mr-sm">{icon}</span>
        <input
          type="text"
          defaultValue={value || ''}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 outline-none text-body-sm"
        />
      </div>
    </div>
  );
}

function UploadBox() {
  return (
    <div className="aspect-video rounded-xl border-2 border-dashed border-secondary/30 flex flex-col items-center justify-center bg-white/50 group cursor-pointer hover:bg-white/80 transition-colors">
      <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined">add_a_photo</span>
      </div>
      <p className="font-label-md text-on-surface">Upload Business Photos</p>
      <p className="text-label-sm text-outline">JPEG, PNG or MP4 (Max 50MB)</p>
    </div>
  );
}

function BusinessShowcase() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/media/mine', { params: { purpose: 'business_showcase' } });
      setItems(data.items || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        form.append('purpose', 'business_showcase');
        const { data } = await api.post('/media/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setItems((prev) => [data.asset, ...prev]);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(asset) {
    if (!confirm('Remove this item?')) return;
    try {
      await api.delete(`/media/${asset._id}`);
      setItems((prev) => prev.filter((i) => i._id !== asset._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-md">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`aspect-video rounded-xl border-2 border-dashed border-secondary/30 flex flex-col items-center justify-center bg-white/50 cursor-pointer hover:bg-white/80 transition-colors ${
          uploading ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-md transition-transform">
          <span className="material-symbols-outlined">{uploading ? 'progress_activity' : 'add_a_photo'}</span>
        </div>
        <p className="font-label-md text-on-surface">
          {uploading ? 'Uploading…' : 'Upload Business Photos'}
        </p>
        <p className="text-label-sm text-outline">JPEG, PNG or MP4 (max 10MB) · drag & drop or click</p>
      </label>

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-md">
          <span className="material-symbols-outlined animate-spin text-secondary">refresh</span>
        </div>
      ) : items.length === 0 ? (
        <p className="text-label-sm text-on-surface-variant text-center py-sm">
          No items yet. Showcase products, premises or completed work.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
          {items.map((a) => (
            <div key={a._id} className="relative group aspect-square rounded-lg overflow-hidden border border-outline-variant bg-white">
              {a.resourceType === 'video' ? (
                <video src={a.secureUrl || a.url} className="w-full h-full object-cover" controls />
              ) : (
                <img src={a.secureUrl || a.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => remove(a)}
                title="Remove"
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressTile({ label, value, caption, color = 'primary', bar }) {
  const c = color === 'secondary' ? 'text-secondary' : 'text-primary';
  return (
    <div className="p-md rounded-xl bg-background border border-outline-variant">
      <p className="font-label-sm text-outline uppercase">{label}</p>
      <p className={`text-headline-sm font-bold ${c} capitalize`}>{value}</p>
      <p className="text-label-sm text-outline mt-sm">{caption}</p>
      {typeof bar === 'number' && (
        <div className="w-full h-1.5 bg-outline-variant rounded-full mt-sm">
          <div className={`h-full rounded-full ${color === 'secondary' ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}

function ImpactSubmit({ onDone }) {
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await api.post('/impact', {
        checkpoint: 'ad_hoc',
        checkpointDate: new Date().toISOString(),
        employmentStatus: 'employed_full_time',
      });
      onDone?.();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button onClick={submit} disabled={busy} className="bg-tertiary-container text-white font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
        {busy ? 'Submitting…' : 'Submit Update'}
      </button>
      <button className="font-label-md text-tertiary-container px-lg py-sm rounded-lg hover:bg-tertiary-container/10 transition-colors border border-tertiary-container/30">
        Learn More
      </button>
    </>
  );
}
