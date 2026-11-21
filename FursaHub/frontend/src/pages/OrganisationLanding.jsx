import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DASHBOARD_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAyP2DqsNc2egk9_JCsWEHlto_4ubCPn2VeLi7lYSTESRsYv3HEQqNNjRb9GnGyeWXGn_z5Z5rEcVuDwxdeYi8TZnCOsxUp_4XiJDjdpHd2VIg7hR-ptNVYo_SHESuKIuPom60v2g2otGanaaVig67RuYkOs83OL3Y5Jf1KfcxwLUD6erlBfLAyh4rmAUJ6LPe1JkwtWdvs2fcQQHU-PqJI_wrg_vWiC68q-W0p6F6UNEjx3nu9S8YAP2xbCDc2h58zJcaxyc8LUpM';

export default function OrganisationLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/journey'} replace />;
  }

  const goRegister = () => navigate('/login?role=admin&mode=register');

  return (
    <div className="bg-[#f5fbf5] text-[#171d1a] min-h-screen" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* TopAppBar */}
      <nav className="w-full sticky top-0 z-50 bg-[#f5fbf5] border-b border-[#bccac1] flex justify-between items-center px-[16px] md:px-[32px] py-4 max-w-[1200px] mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00694c]" data-icon="hub">hub</span>
          <span className="text-[24px] leading-[1.3] font-bold text-[#2a6959]">FursaHub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex items-center text-[14px] font-semibold text-[#085041] hover:text-[#00694c] px-3 py-2 rounded-[8px] transition-colors"
          >
            Sign in
          </Link>
          <button
            onClick={goRegister}
            className="bg-[#008560] text-white px-4 py-2 rounded-[8px] text-[14px] tracking-[0.01em] font-semibold hover:bg-[#00694c] transition-colors active:scale-95 duration-150"
          >
            Post an Opportunity
          </button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="px-[16px] md:px-[32px] py-[64px] max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row gap-[40px] items-center">
            <div className="w-full md:w-1/2 flex flex-col gap-[24px]">
              <h1 className="text-[28px] leading-[1.2] md:text-[32px] md:tracking-[-0.02em] font-bold text-[#171d1a]">
                Reach Youth Who Need Your Programmes
              </h1>
              <p className="text-[18px] leading-[1.6] text-[#3d4943]">
                Post courses, opportunities, and mentorship programmes directly to verified youth in Kakuma.
              </p>
              <div className="flex flex-col sm:flex-row gap-[8px]">
                <button
                  onClick={goRegister}
                  className="bg-[#1D9E75] text-white px-[64px] py-4 rounded-[8px] text-[14px] tracking-[0.01em] font-semibold active:scale-95 transition-all"
                >
                  Post an Opportunity
                </button>
                <a
                  href="#how-it-works"
                  className="border-2 border-[#085041] text-[#085041] px-[64px] py-4 rounded-[8px] text-[14px] tracking-[0.01em] font-semibold text-center hover:bg-[#eaefea] active:scale-95 transition-all"
                >
                  Learn How It Works
                </a>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <img alt="Dashboard Preview" className="w-full rounded-[8px] border border-[#bccac1]" src={DASHBOARD_IMG} />
            </div>
          </div>
        </section>

        {/* Why Partner Section */}
        <section className="bg-[#E1F5EE] py-[64px]">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px]">Why Partner with FursaHub?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[40px]">
              <FeatureCircle icon="verified_user" title="Verified Youth Reach">
                Access a database of verified, active youth looking for growth.
              </FeatureCircle>
              <FeatureCircle icon="groups" title="Zero Middlemen">
                Connect directly with applicants without administrative friction.
              </FeatureCircle>
              <FeatureCircle icon="bar_chart" title="Impact Visibility">
                Track your programme's success with real-time data and analytics.
              </FeatureCircle>
            </div>
          </div>
        </section>

        {/* What You Can Post Section */}
        <section className="bg-[#f5fbf5] py-[64px]">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px]">What You Can Post</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
              <PostCard title="Courses">
                Vocational training, digital skills, and language classes for youth empowerment.
              </PostCard>
              <PostCard title="Opportunities">
                Internships, local job placements, and micro-entrepreneurship grants.
              </PostCard>
              <PostCard title="Mentorship">
                One-on-one sessions, group workshops, and career guidance programmes.
              </PostCard>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-[#085041] py-[64px] text-white">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px]">How It Works</h2>
            <div className="relative flex flex-col md:flex-row gap-[40px]">
              {/* Impact Navigator line (Desktop only) */}
              <div className="hidden md:block absolute top-10 left-10 right-10 h-0.5 bg-[#1D9E75]/30 z-0"></div>
              <Step n="1" title="Create Profile" desc="Set up your organisation's identity and mission within the portal." />
              <Step n="2" title="Submit Post" desc="Fill out our simple form with programme details and requirements." />
              <Step n="3" title="Verify" desc="Our team quickly reviews the content for community safety and relevance." />
              <Step n="4" title="Manage" desc="Track applications and communicate with potential candidates directly." />
            </div>
          </div>
        </section>

        {/* Who Is Already Here Section */}
        <section className="bg-[#FAEEDA] py-[64px]">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto">
            <h2 className="text-[24px] leading-[1.3] font-bold text-center mb-[64px]">Who Is Already Here</h2>
            <div className="flex flex-wrap justify-center gap-[24px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#dee4de]/50 w-32 h-20 rounded-[8px] flex items-center justify-center grayscale opacity-70"
                >
                  <span className="text-[#3d4943] text-[12px] leading-[1.2] font-medium uppercase">Partner NGO</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="bg-[#f5fbf5] py-[64px]">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-[40px]">
              <div className="w-full md:w-1/2 order-2 md:order-1">
                <img alt="Dashboard Detail" className="w-full rounded-[8px] border border-[#bccac1]" src={DASHBOARD_IMG} />
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2 flex flex-col gap-[24px]">
                <h2 className="text-[28px] leading-[1.2] md:text-[32px] md:tracking-[-0.02em] font-bold">
                  Everything in One Place
                </h2>
                <ul className="flex flex-col gap-[8px]">
                  <Bullet>Real-time applicant tracking</Bullet>
                  <Bullet>Downloadable impact reports</Bullet>
                  <Bullet>Automated notification system</Bullet>
                  <Bullet>Direct communication dashboard</Bullet>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-[#1D9E75] py-[64px] text-center">
          <div className="px-[16px] md:px-[32px] max-w-[1200px] mx-auto flex flex-col items-center gap-[24px]">
            <h2 className="text-[28px] leading-[1.2] md:text-[32px] md:tracking-[-0.02em] font-bold text-white">
              Start Reaching Kakuma Youth Today
            </h2>
            <button
              onClick={goRegister}
              className="bg-white text-[#1D9E75] px-[64px] py-4 rounded-[8px] text-[14px] tracking-[0.01em] font-bold hover:bg-[#f5fbf5] transition-all active:scale-95"
            >
              Register Your Organisation
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-[64px] bg-[#eff5ef] border-t border-[#bccac1]">
        <div className="flex flex-col md:flex-row justify-between items-center px-[16px] md:px-[32px] gap-[24px] max-w-[1200px] mx-auto">
          <div className="flex flex-col gap-[4px] items-center md:items-start">
            <span className="text-[20px] leading-[1.4] font-bold text-[#2a6959]">FursaHub</span>
            <p className="text-[14px] leading-[1.2] tracking-[0.01em] font-semibold text-[#3d4943]">
              © 2024 FursaHub. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-[24px] items-center">
            <a className="text-[14px] leading-[1.2] tracking-[0.01em] font-semibold text-[#3d4943] hover:text-[#00694c] transition-colors" href="#">Privacy Policy</a>
            <a className="text-[14px] leading-[1.2] tracking-[0.01em] font-semibold text-[#3d4943] hover:text-[#00694c] transition-colors" href="#">Terms of Service</a>
            <a className="text-[14px] leading-[1.2] tracking-[0.01em] font-semibold text-[#3d4943] hover:text-[#00694c] transition-colors" href="#">Contact Support</a>
            <Link to="/" className="text-[14px] leading-[1.2] tracking-[0.01em] font-bold text-[#00694c] flex items-center gap-1 hover:underline">
              For Youth <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCircle({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center text-center gap-[8px]">
      <div className="w-16 h-16 rounded-full border-2 border-[#1D9E75] flex items-center justify-center">
        <span className="material-symbols-outlined text-[#1D9E75] text-3xl" data-icon={icon}>{icon}</span>
      </div>
      <h3 className="text-[20px] leading-[1.4] font-semibold">{title}</h3>
      <p className="text-[16px] leading-[1.6] text-[#3d4943]">{children}</p>
    </div>
  );
}

function PostCard({ title, children }) {
  return (
    <div className="p-[24px] bg-white border border-[#bccac1] rounded-[8px] group hover:border-[#1D9E75] transition-colors">
      <h3 className="text-[20px] leading-[1.4] font-semibold mb-[4px]">{title}</h3>
      <div className="h-1 w-12 bg-[#1D9E75] mb-[24px]"></div>
      <p className="text-[16px] leading-[1.6] text-[#3d4943]">{children}</p>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="relative z-10 flex-1 flex flex-col gap-[12px]">
      <div className="w-12 h-12 rounded-full bg-white text-[#1D9E75] flex items-center justify-center font-bold text-xl border-2 border-[#1D9E75]">
        {n}
      </div>
      <h4 className="text-[20px] leading-[1.4] font-semibold">{title}</h4>
      <p className="text-[16px] leading-[1.6] text-[#68dbae]">{desc}</p>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-center gap-[12px]">
      <span className="material-symbols-outlined text-[#1D9E75]" data-icon="check_circle">check_circle</span>
      <span className="text-[18px] leading-[1.6]">{children}</span>
    </li>
  );
}
