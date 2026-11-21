import { useEffect, useState } from 'react';
import api from '../lib/api';

const GALLERY = [
  { title: "Aminata's Tech Journey", img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOB_1fAEYYSMI-bTW7yDPpUeD2CJOLPCxzTXfx9GbkfTTqa6SHYG5qX1O2RlF8CT_AluDio5kjl2I8o8e-ZDEuxZ5cMtFGSRAfxjfFPPdNP__OlSymW4ZmEJAZEDffgljc9YM1RHsQmF-lRXWNZRAC0_rynr5a-TKEL_fye0SzkzFyOT7tEK4WY-_9wH19q6C4J4OX5F3GIyNJCU7r9hNEFvo26KYFNPe9HYtG5fTwEyYUBgpm-3Iy0TKlwlX36bCYNXRjabc2iG0' },
  { title: 'Solar Engineering Workshop', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYw1EEdDBo46ZRIWC5VsC5BUOcdfElNVVz1jGdBRKxDO82nW5UVAnux6b36fePApvM3J6gZ1OiwFk6_eVavxcHvQHu6JejtjV1FyuA4Wc-Y0755O8E5NIZsGOrmAkBQ0MGg2iB_AJNPLH96fycojVkcaSjNFlMIdGwBcSXRdFrWZ-ef8kXSU3-0ofhvIWy3EwCkSCQ4rD-M7V8ThKLF9aaFTna81kA2vDp4UWvH-h5U1-uqblSXKOXC9ddn3BP3tX33MHvLpliVq8' },
  { title: 'Digital Marketing Cohort', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk_HVzM1tZBKhGRwDK4w5N9K6StT7fWtu6hsBu45pUSOO0qOUkB8l-qpPBh3I5IR1fbjll7Y0gLUQeaisk1Ir9VxGp-jEl1X42haMYdocHqYlpqYzy-8NGklbQXH0D88TsR_SaF2pADV2hzns6NYoH8J1SyvADUlM1OOIQ69aPLT2bauBu9Wy5htVaQWuW0kpWbBVCBQ-ciJNY9yyEHtdyYkY845xrDrI6J5nKn55QdOlKUPIZI8CEowFuoMciw86tNoRINHbx0EI' },
  { title: 'Entrepreneurship Day', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ3JMpuMHPmQ0xhHrzn6OZ8POG4v3D6H4Z86WjFkptgf08j7zNnwpQ-cvgkWCfbDCoohMaMLcKyeu_vEHuPu4XozGW-vX_KHgrEwbVIzdU50cTpNYuTGh-gPrwOmiKHD9sXmrCcBgYeqPGw4mBrO0sf-6Ue7oKa7qVK9L7RKaTprJ4B0UdCPJBh-eisVl9bIFZaILBnoMZV3AUqqlpF1Bc9w73bpD4KbU--2uPTIHfQWVhxqr9FbwRCCfR1TTQDKgR9Kba-V5FLkI' },
];

const STATUS_STYLES = {
  employed_full_time: { label: 'Employed (using skill)', bg: 'bg-secondary-container', text: 'text-on-secondary-container', dot: 'bg-secondary' },
  employed_part_time: { label: 'Employed (part-time)', bg: 'bg-secondary-container', text: 'text-on-secondary-container', dot: 'bg-secondary' },
  self_employed: { label: 'Business Owner', bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed-variant', dot: 'bg-tertiary' },
  further_study: { label: 'Further Study', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant', dot: 'bg-primary' },
  unemployed: { label: 'Seeking Opportunity', bg: 'bg-surface-variant', text: 'text-on-surface-variant', dot: 'bg-outline' },
  unknown: { label: 'Unverified', bg: 'bg-surface-variant', text: 'text-on-surface-variant', dot: 'bg-outline' },
};

export default function Dashboard() {
  const [summary, setSummary] = useState({ enrolled: 0, graduated: 0, tracked: 0 });
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // modal state
  const [modalRow, setModalRow] = useState(null);
  const [modalStatus, setModalStatus] = useState('employed_full_time');
  const [modalNotes, setModalNotes] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, impactRes] = await Promise.all([
        api.get('/users', { params: { role: 'student', limit: 200 } }).catch(() => ({ data: { items: [], total: 0 } })),
        api.get('/impact', { params: { limit: 200 } }).catch(() => ({ data: { items: [], total: 0 } })),
      ]);
      const students = usersRes.data.items || [];
      const impact = impactRes.data.items || [];

      // latest record per student
      const byStudent = new Map();
      impact.forEach((r) => {
        const sid = String(r.student?._id || r.student);
        const prev = byStudent.get(sid);
        if (!prev || new Date(r.checkpointDate) > new Date(prev.checkpointDate)) byStudent.set(sid, r);
      });

      const tableRows = students.map((s) => {
        const latest = byStudent.get(String(s._id));
        return {
          id: s._id,
          name: s.name,
          email: s.email,
          program: s.profile?.program || '—',
          status: latest?.employmentStatus || 'unknown',
          lastVerified: latest?.verifiedAt || latest?.checkpointDate,
        };
      });

      setRows(tableRows);
      setSummary({
        enrolled: usersRes.data.total ?? students.length,
        graduated: students.filter((s) => s.profile?.graduationDate).length,
        tracked: byStudent.size,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openModal(row) {
    setModalRow(row);
    setModalStatus(row.status === 'unknown' ? 'employed_full_time' : row.status);
    setModalNotes('');
  }

  async function saveModal() {
    if (!modalRow) return;
    setModalSaving(true);
    try {
      await api.post('/impact', {
        student: modalRow.id,
        checkpoint: 'ad_hoc',
        checkpointDate: new Date().toISOString(),
        employmentStatus: modalStatus,
        storyHighlights: modalNotes,
      });
      setModalRow(null);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setModalSaving(false);
    }
  }

  async function exportReport(kind) {
    const token = localStorage.getItem('fursahub_token');
    const res = await fetch(`/api/exports/impact.${kind}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => !filter || r.status === filter);

  return (
    <>
      <section className="mb-xxl flex flex-col md:flex-row md:items-end justify-between gap-lg">
        <div>
          <span className="text-label-md font-label-md text-secondary uppercase tracking-wider">
            Organizational Monitoring
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary mt-xs">Outcome Tracking Dashboard</h2>
          <p className="text-body-md text-on-surface-variant mt-sm max-w-2xl">
            Real-time employment and entrepreneurship data for graduates of Kakuma refugee camp technical programs.
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="bg-secondary text-on-secondary px-md py-sm rounded-lg font-label-md flex items-center gap-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined">add_circle</span>
            Post New Course
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="bg-white border border-outline-variant text-on-surface-variant px-md py-sm rounded-lg font-label-md flex items-center gap-sm hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Donor PDF
          </button>
          <button
            onClick={() => exportReport('csv')}
            className="bg-white border border-outline-variant text-on-surface-variant px-md py-sm rounded-lg font-label-md flex items-center gap-sm hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined">download</span>
            CSV
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xxl">
        <Stat label="Enrolled" value={summary.enrolled} caption="Total active learners" />
        <Stat label="Graduated" value={summary.graduated} caption="Successfully completed tracks" />
        <Stat label="Impact-Tracked" value={summary.tracked} caption="Verified employment outcomes" />
      </section>

      <section className="mb-xxl">
        <h3 className="font-headline-sm text-headline-sm text-primary mb-lg">Media Gallery: Success Stories</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          {GALLERY.map((g) => (
            <div key={g.title} className="aspect-video rounded-lg bg-surface-container-high overflow-hidden relative group cursor-pointer">
              <img src={g.img} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-md">
                <span className="text-white text-label-sm">{g.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <h3 className="font-headline-sm text-headline-sm text-primary">Beneficiary Directory</h3>
          <div className="flex items-center gap-sm">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg px-md py-xs text-body-sm focus:ring-primary focus:border-primary"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_STYLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className="bg-surface-container-high text-on-surface-variant px-md py-xs rounded-lg font-label-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-on-surface-variant border-b border-outline-variant">
                <Th>Graduate</Th>
                <Th>Course Track</Th>
                <Th>Current Status</Th>
                <Th>Last Verified</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading && (
                <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-xl text-on-surface-variant">No graduates yet. Register a student to see them here.</td></tr>
              )}
              {filtered.map((r) => {
                const s = STATUS_STYLES[r.status] || STATUS_STYLES.unknown;
                return (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-lg py-lg">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed-dim border border-outline-variant flex items-center justify-center text-primary font-bold">
                          {r.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-label-md text-label-md text-on-surface">{r.name}</div>
                          <div className="text-body-sm text-on-surface-variant">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-lg">
                      <span className="text-body-sm text-on-surface-variant">{r.program}</span>
                    </td>
                    <td className="px-lg py-lg">
                      <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full ${s.bg} ${s.text} text-label-sm font-label-sm`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-lg py-lg">
                      <span className="text-body-sm text-on-surface-variant">
                        {r.lastVerified ? new Date(r.lastVerified).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-lg py-lg text-right">
                      <button
                        onClick={() => openModal(r)}
                        className="bg-white border px-md py-sm rounded-lg font-label-md transition-all active:scale-95 hover:opacity-90"
                        style={{ borderColor: '#1D9E75', color: '#1D9E75' }}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-lg bg-surface flex items-center justify-between border-t border-outline-variant">
          <span className="text-body-sm text-on-surface-variant">
            Showing {filtered.length} of {rows.length} graduates
          </span>
        </div>
      </section>

      {modalRow && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-md">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center">
              <h4 className="font-headline-sm text-headline-sm text-primary">Update Graduate Status</h4>
              <button onClick={() => setModalRow(null)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg space-y-lg">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">
                  {modalRow.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-label-md text-label-md text-on-surface">{modalRow.name}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    Current: {STATUS_STYLES[modalRow.status]?.label || modalRow.status}
                  </div>
                </div>
              </div>

              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface">Select New Status</label>
                <div className="grid grid-cols-1 gap-sm">
                  {[
                    ['employed_full_time', 'Employed (Using Skill)'],
                    ['self_employed', 'Business Owner'],
                    ['unemployed', 'Seeking Opportunity'],
                    ['further_study', 'Further Study'],
                  ].map(([val, label]) => (
                    <label
                      key={val}
                      className="flex items-center gap-md p-md border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-container/5"
                    >
                      <input
                        type="radio"
                        name="newStatus"
                        value={val}
                        checked={modalStatus === val}
                        onChange={(e) => setModalStatus(e.target.value)}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="text-body-md">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-sm">
                <label className="font-label-md text-label-md text-on-surface">Verification Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full border border-outline-variant rounded-lg p-md text-body-sm focus:ring-primary focus:border-primary"
                  placeholder="Details about new role or business..."
                />
              </div>
            </div>
            <div className="p-lg bg-surface flex justify-end gap-md border-t border-outline-variant">
              <button
                onClick={() => setModalRow(null)}
                className="px-md py-sm font-label-md text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveModal}
                disabled={modalSaving}
                className="px-xl py-sm font-label-md bg-primary text-on-primary rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {modalSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, caption }) {
  return (
    <div className="p-xl rounded-xl border border-secondary/20 flex flex-col gap-sm" style={{ backgroundColor: '#E1F5EE' }}>
      <span className="text-label-md font-bold text-on-secondary-fixed-variant uppercase">{label}</span>
      <div className="text-headline-xl font-headline-xl" style={{ color: '#085041' }}>
        {value.toLocaleString()}
      </div>
      <p className="text-body-sm text-on-secondary-fixed-variant">{caption}</p>
    </div>
  );
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-lg py-md font-label-md text-label-md uppercase tracking-wider ${className}`}>{children}</th>
  );
}
