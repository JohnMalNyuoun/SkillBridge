import { Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AudienceChooser from '../components/AudienceChooser';

export default function Landing() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/journey'} replace />;
  }

  const [stats, setStats] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/public/stats')
      .then((res) => { if (alive) setStats(res.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const fmt = (n) => (typeof n === 'number' && n > 0 ? `${n}+ ` : '');

  return (
    <div className="bg-[#f5fbf5] text-[#171d1a] min-h-screen" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-[#f5fbf5]">
        <nav className="flex justify-between items-center px-[16px] md:px-[32px] py-[8px] w-full max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00694c] text-[24px]" data-icon="hub">hub</span>
            <span className="text-[24px] leading-[1.3] text-[#00694c] font-bold">FursaHub</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/organisations"
              className="hidden sm:inline-flex items-center text-[14px] font-semibold text-[#085041] hover:text-[#00694c] px-3 py-2 rounded-[8px] transition-colors"
            >
              For Organisations
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center text-[14px] font-semibold text-white bg-[#1D9E75] hover:bg-[#00694c] px-4 py-2 rounded-[8px] transition-colors active:scale-95"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14">
        {/* Hero Section */}
        <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))' }}></div>
            <img
              alt="FursaHub Community"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfY0qlXbOvKRL7-4kez_IenbSPxll0nPoo-xw9g-wX-m6130GuD18dR_YntosgOQDMgvA3WYDxSsUHlJF5NrKbyYatfDSCcDTQHRGBm3vSi3lpzVZRQaiPIjgBhZsO5nm4OHd8wl4MD6d6gTFYAIyL6S42-0zFqD3ohbGigHcqFDWwHplPpKyWubnk1YHbZpyH5XCf45R_Rjn5bgBI3gDiksZiGQROEfCgnYn28Fsfidu4cEsTWtTPH5xBiMn5955n78xDgRjV7y4"
            />
          </div>
          <div className="relative z-20 px-[16px] text-center max-w-2xl mx-auto flex flex-col items-center">
            <h1 className="text-white text-[28px] leading-[1.2] md:text-[32px] md:tracking-[-0.02em] font-bold mb-[24px]">
              Your Next Opportunity Starts Here
            </h1>
            <p className="text-white text-[18px] leading-[1.6] mb-[40px] opacity-90">
              Discover courses, mentorship, and pathways built for youth in Kakuma
            </p>
            <a
              href="#discover"
              className="bg-[#1D9E75] text-white px-[64px] py-[12px] rounded-[0.5rem] text-[14px] tracking-[0.01em] font-semibold active:scale-95 transition-transform inline-flex items-center justify-center min-h-[44px]"
            >
              Explore Opportunities
            </a>
          </div>
        </section>

        {/* What is FursaHub Section */}
        <section className="bg-[#E1F5EE] py-[64px] px-[16px]">
          <div className="max-w-[600px] mx-auto text-center">
            <h2 className="relative inline-block text-[24px] leading-[1.3] text-[#00513a] font-bold mb-[40px]">
              What is FursaHub
              <span
                aria-hidden="true"
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: '-8px', width: '48px', height: '3px', backgroundColor: '#1D9E75' }}
              ></span>
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#3d4943] mt-[24px]">
              We are a digital bridge connecting the vibrant talent in Kakuma with world-class learning and professional growth. Our platform is designed to turn potential into tangible impact.
            </p>
          </div>
        </section>

        {/* What You Can Find Here Section */}
        <section className="bg-white py-[64px] px-[16px]" id="discover">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px]">What You Can Find Here</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[40px]">
              {/* Courses */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-[24px] text-center md:text-left">
                <div className="flex-shrink-0 w-12 h-12 rounded-[0.5rem] flex items-center justify-center border border-[#1D9E75]/30">
                  <span className="material-symbols-outlined text-[#1D9E75] text-3xl" data-icon="auto_stories">auto_stories</span>
                </div>
                <div>
                  <h3 className="text-[20px] leading-[1.4] font-semibold text-[#171d1a] mb-[4px]">Courses</h3>
                  <p className="text-[16px] leading-[1.6] text-[#3d4943]">{fmt(stats?.stories)}Access digital skills and vocational training tailored for your future.</p>
                </div>
              </div>
              {/* Mentorship */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-[24px] text-center md:text-left">
                <div className="flex-shrink-0 w-12 h-12 rounded-[0.5rem] flex items-center justify-center border border-[#1D9E75]/30">
                  <span className="material-symbols-outlined text-[#1D9E75] text-3xl" data-icon="groups">groups</span>
                </div>
                <div>
                  <h3 className="text-[20px] leading-[1.4] font-semibold text-[#171d1a] mb-[4px]">Mentorship</h3>
                  <p className="text-[16px] leading-[1.6] text-[#3d4943]">{fmt(stats?.students)}Connect with experienced professionals who guide your career journey.</p>
                </div>
              </div>
              {/* Opportunities */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-[24px] text-center md:text-left">
                <div className="flex-shrink-0 w-12 h-12 rounded-[0.5rem] flex items-center justify-center border border-[#1D9E75]/30">
                  <span className="material-symbols-outlined text-[#1D9E75] text-3xl" data-icon="rocket_launch">rocket_launch</span>
                </div>
                <div>
                  <h3 className="text-[20px] leading-[1.4] font-semibold text-[#171d1a] mb-[4px]">Opportunities</h3>
                  <p className="text-[16px] leading-[1.6] text-[#3d4943]">{fmt(stats?.opportunities)}Find local and remote jobs, internships, and startup funding.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-[#085041] py-[64px] px-[16px] text-white">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px] text-[#E1F5EE]">How It Works</h2>
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-[64px]">
              {/* Vertical Line for Mobile */}
              <div className="absolute left-6 top-8 bottom-8 w-px bg-white/10 md:hidden"></div>
              {/* Step 01 */}
              <div className="relative flex md:flex-col items-center gap-[24px] z-10 w-full md:w-1/3">
                <div className="flex-shrink-0 w-12 h-12 bg-[#085041] text-[#E1F5EE] border border-white/20 rounded-full flex items-center justify-center font-bold text-lg">01</div>
                <div className="flex flex-col md:items-center">
                  <h3 className="text-[20px] leading-[1.4] font-semibold mb-[4px]">Sign Up</h3>
                  <p className="text-[16px] leading-[1.6] text-[#E1F5EE]/80 md:text-center">Create your free profile in minutes.</p>
                </div>
              </div>
              {/* Step 02 */}
              <div className="relative flex md:flex-col items-center gap-[24px] z-10 w-full md:w-1/3">
                <div className="flex-shrink-0 w-12 h-12 bg-[#085041] text-[#E1F5EE] border border-white/20 rounded-full flex items-center justify-center font-bold text-lg">02</div>
                <div className="flex flex-col md:items-center">
                  <h3 className="text-[20px] leading-[1.4] font-semibold mb-[4px]">Explore</h3>
                  <p className="text-[16px] leading-[1.6] text-[#E1F5EE]/80 md:text-center">Browse through hundreds of curated resources.</p>
                </div>
              </div>
              {/* Step 03 */}
              <div className="relative flex md:flex-col items-center gap-[24px] z-10 w-full md:w-1/3">
                <div className="flex-shrink-0 w-12 h-12 bg-[#085041] text-[#E1F5EE] border border-white/20 rounded-full flex items-center justify-center font-bold text-lg">03</div>
                <div className="flex flex-col md:items-center">
                  <h3 className="text-[20px] leading-[1.4] font-semibold mb-[4px]">Apply</h3>
                  <p className="text-[16px] leading-[1.6] text-[#E1F5EE]/80 md:text-center">Start your journey toward a better career.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="bg-[#FAEEDA] py-[64px] px-[16px]">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px] text-[#635b4c]">Who It's For</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
              <div className="p-[40px] flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-[#1D9E75] mb-[8px] text-4xl" data-icon="volunteer_activism">volunteer_activism</span>
                <h3 className="text-[20px] leading-[1.4] font-semibold mb-[12px]">Refugee Youth</h3>
                <p className="text-[16px] leading-[1.6] text-[#3d4943]">Overcoming barriers with accessible tools for self-reliance.</p>
              </div>
              <div className="p-[40px] flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-[#1D9E75] mb-[8px] text-4xl" data-icon="handshake">handshake</span>
                <h3 className="text-[20px] leading-[1.4] font-semibold mb-[12px]">Host Community Youth</h3>
                <p className="text-[16px] leading-[1.6] text-[#3d4943]">Growing together through shared education and growth.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-[#1D9E75] py-[64px] px-[16px]">
          <div className="max-w-[1200px] mx-auto text-center flex flex-col items-center">
            <h2 className="text-[28px] leading-[1.2] text-white font-bold mb-[40px]">Ready to Find Your Fursa?</h2>
            <button
              type="button"
              onClick={() => setChooserOpen(true)}
              className="bg-white text-[#1D9E75] px-[64px] py-[12px] rounded-[0.5rem] text-[14px] tracking-[0.01em] font-semibold active:scale-95 transition-transform min-h-[44px] flex items-center justify-center shadow-sm"
            >
              Get Started
            </button>
            <NewsletterForm />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#085041] py-[40px] px-[16px] md:px-[32px] text-white">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center space-y-[24px] md:space-y-0">
          <div className="flex flex-col items-center md:items-start gap-[4px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white text-[24px]" data-icon="hub">hub</span>
              <span className="text-[20px] font-bold">FursaHub</span>
            </div>
            <p className="text-white/60 text-[12px] leading-[1.2] italic">Built for the youth of Kakuma. Powered by opportunity.</p>
          </div>
          <div className="flex gap-[40px] text-[16px] leading-[1.6]">
            <a className="hover:text-[#68dbae] transition-colors" href="#">Impact</a>
            <a className="hover:text-[#68dbae] transition-colors" href="#">Privacy</a>
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="hover:text-[#68dbae] transition-colors bg-transparent p-0"
            >
              Support
            </button>
          </div>
          <div className="flex gap-[24px]">
            <span className="material-symbols-outlined cursor-pointer hover:text-[#68dbae]" data-icon="language">language</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#68dbae]" data-icon="share">share</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#68dbae]" data-icon="mail">mail</span>
          </div>
        </div>
        <div className="mt-[40px] pt-[24px] border-t border-white/10 text-center text-white/40 text-[12px] leading-[1.2]">
          © 2024 FursaHub. Empowerment Through Access.
        </div>
      </footer>

      {/* Mobile Bottom Navigation Shell */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-[12px] pb-[8px] bg-white border-t border-[#bccac1]">
        <div className="flex flex-col items-center justify-center bg-[#adedd8] text-[#2f6d5d] rounded-full px-[4px] py-[4px] active:scale-90 transition-all duration-200">
          <span className="material-symbols-outlined" data-icon="home" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[12px] leading-[1.2] font-medium">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#3d4943] p-2 active:scale-90 transition-all duration-200">
          <span className="material-symbols-outlined" data-icon="search">search</span>
          <span className="text-[12px] leading-[1.2] font-medium">Discover</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#3d4943] p-2 active:scale-90 transition-all duration-200">
          <span className="material-symbols-outlined" data-icon="lightbulb">lightbulb</span>
          <span className="text-[12px] leading-[1.2] font-medium">Guide</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#3d4943] p-2 active:scale-90 transition-all duration-200">
          <span className="material-symbols-outlined" data-icon="person_add">person_add</span>
          <span className="text-[12px] leading-[1.2] font-medium">Join</span>
        </div>
      </div>

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      {chooserOpen && <AudienceChooser onClose={() => setChooserOpen(false)} />}
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await api.post('/public/subscribe', { email, source: 'landing' });
      setStatus({ state: 'success', message: "You're on the list. We'll be in touch." });
      setEmail('');
    } catch (err) {
      setStatus({
        state: 'error',
        message: err.response?.data?.message || 'Could not subscribe. Try again later.',
      });
    }
  };

  return (
    <form onSubmit={submit} className="mt-[24px] w-full max-w-md flex flex-col items-center gap-[8px]">
      <div className="flex w-full gap-[8px]">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email to stay updated"
          className="flex-1 px-[16px] py-[10px] rounded-[0.5rem] text-[14px] text-[#171d1a] bg-white/95 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="submit"
          disabled={status.state === 'loading'}
          className="bg-[#085041] text-white px-[20px] py-[10px] rounded-[0.5rem] text-[14px] font-semibold active:scale-95 transition-transform disabled:opacity-60"
        >
          {status.state === 'loading' ? '...' : 'Subscribe'}
        </button>
      </div>
      {status.message && (
        <p
          className={`text-[12px] leading-[1.2] ${
            status.state === 'error' ? 'text-white' : 'text-white/90'
          }`}
        >
          {status.message}
        </p>
      )}
    </form>
  );
}

function ContactModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      await api.post('/public/contact', form);
      setStatus({ state: 'success', message: 'Message sent. Our team will get back to you.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err.response?.data?.message || 'Could not send message. Try again later.',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-[16px]"
      onClick={onClose}
    >
      <div
        className="bg-white text-[#171d1a] rounded-[0.5rem] w-full max-w-md p-[24px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-[16px]">
          <h3 className="text-[20px] leading-[1.4] font-semibold">Contact Support</h3>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-[#3d4943] hover:text-[#171d1a]"
            aria-label="Close"
          >
            close
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-[12px]">
          <input
            type="text"
            required
            value={form.name}
            onChange={update('name')}
            placeholder="Your name"
            className="px-[12px] py-[10px] rounded-[0.5rem] border border-[#bccac1] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            placeholder="Email"
            className="px-[12px] py-[10px] rounded-[0.5rem] border border-[#bccac1] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          <input
            type="text"
            value={form.subject}
            onChange={update('subject')}
            placeholder="Subject (optional)"
            className="px-[12px] py-[10px] rounded-[0.5rem] border border-[#bccac1] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={update('message')}
            placeholder="How can we help?"
            className="px-[12px] py-[10px] rounded-[0.5rem] border border-[#bccac1] text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          {status.message && (
            <p className={`text-[12px] ${status.state === 'error' ? 'text-[#ba1a1a]' : 'text-[#00694c]'}`}>
              {status.message}
            </p>
          )}
          <button
            type="submit"
            disabled={status.state === 'loading'}
            className="bg-[#1D9E75] text-white px-[24px] py-[12px] rounded-[0.5rem] text-[14px] font-semibold active:scale-95 transition-transform disabled:opacity-60"
          >
            {status.state === 'loading' ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
