import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import VisibilityPicker from '../components/VisibilityPicker';

const TYPES = [
  { value: 'training', label: 'Training' },
  { value: 'internship', label: 'Internship' },
  { value: 'job', label: 'Job' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'other', label: 'Other' },
];

export default function OpportunityNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'training',
    organization: '',
    location: '',
    remote: false,
    applicationUrl: '',
    contactEmail: '',
    deadline: '',
    startDate: '',
    skillsRequired: '',
    tags: '',
    status: 'published',
    visibility: '', // must be explicitly selected — visibility gate
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim() || !form.organization.trim()) {
      setError('Title, description and organization are required.');
      return;
    }
    if (!form.visibility) {
      setError('Please choose who can see this opportunity: Public or Followers Only.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        organization: form.organization.trim(),
        location: form.location.trim() || undefined,
        remote: !!form.remote,
        applicationUrl: form.applicationUrl.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        deadline: form.deadline || undefined,
        startDate: form.startDate || undefined,
        skillsRequired: form.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        status: form.status,
        visibility: form.visibility,
      };
      await api.post('/opportunities', payload);
      navigate('/explore');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-xl">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Post an Opportunity</h2>
        <p className="text-body-md text-on-surface-variant">
          Share a training, job, scholarship, internship, or mentorship with the community. Stored in the backend and visible on Explore.
        </p>
      </div>

      <form onSubmit={submit} className="bg-surface border border-outline-variant rounded-xl p-lg space-y-md">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="E.g. Frontend Internship at Acme"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Type">
            <select value={form.type} onChange={(e) => update('type', e.target.value)} className={inputCls}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputCls}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>

        <Field label="Organization">
          <input
            type="text"
            value={form.organization}
            onChange={(e) => update('organization', e.target.value)}
            placeholder="E.g. K-NODE"
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Role, requirements, and what learners will gain…"
            className={`${inputCls} resize-y`}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="Kakuma, Kenya"
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) => update('remote', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-label-md">Remote</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Application URL">
            <input
              type="url"
              value={form.applicationUrl}
              onChange={(e) => update('applicationUrl', e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => update('contactEmail', e.target.value)}
              placeholder="hr@example.com"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Field label="Deadline">
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update('startDate', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Skills required (comma-separated)">
          <input
            type="text"
            value={form.skillsRequired}
            onChange={(e) => update('skillsRequired', e.target.value)}
            placeholder="react, node, communication"
            className={inputCls}
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={form.tags}
            onChange={(e) => update('tags', e.target.value)}
            placeholder="entry-level, kakuma, paid"
            className={inputCls}
          />
        </Field>

        <VisibilityPicker
          value={form.visibility}
          onChange={(v) => update('visibility', v)}
        />

        {error && <p className="text-red-600 text-body-sm">{error}</p>}

        <div className="flex justify-end gap-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-lg py-sm rounded-lg border border-outline-variant font-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-xl py-sm rounded-lg text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#085041' }}
          >
            {busy ? 'Posting…' : 'Publish Opportunity'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full border border-outline-variant rounded-lg p-sm bg-background outline-none focus:ring-2 focus:ring-fursa-primary text-body-sm';

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-label-sm text-outline mb-xs uppercase">{label}</label>
      {children}
    </div>
  );
}
