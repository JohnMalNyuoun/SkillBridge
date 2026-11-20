import { useState } from 'react';
import { Link } from 'react-router-dom';
import skillBridgeLogo from '../assets/skillbridge logo.jpg';
import usePwaInstall from '../hooks/usePwaInstall';

const Landing = () => {
  const {
    isInstallAvailable,
    isStandalone,
    isInstallationComplete,
    canShowInstallGuide,
    isPrompting,
    requestInstall,
  } = usePwaInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installMessage, setInstallMessage] = useState('');

  const handleInstallClick = async () => {
    setInstallMessage('');
    if (!isInstallAvailable) {
      setShowInstallGuide((visible) => !visible);
      return;
    }

    setShowInstallGuide(false);
    const result = await requestInstall();
    if (result.outcome === 'dismissed') {
      setInstallMessage('Installation was canceled. You can keep using SkillBridge in your browser.');
    } else if (result.outcome === 'unavailable' || result.outcome === 'error') {
      setShowInstallGuide(true);
      setInstallMessage('The install prompt is unavailable. You can try the browser instructions below.');
    } else if (result.outcome === 'accepted') {
      setInstallMessage('Installation accepted. Follow any remaining browser steps to finish.');
    }
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* Responsive Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}>
        <nav
          aria-label="Main navigation"
          style={{
            maxWidth: '1140px',
            margin: '0 auto',
            padding: '0 clamp(16px, 3vw, 24px)',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            aria-label="SkillBridge home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              flexShrink: 0
            }}
          >
            <img
              src={skillBridgeLogo}
              alt=""
              style={{
                width: '40px',
                height: '30px',
                objectFit: 'contain',
                background: '#ffffff',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                padding: '2px'
              }}
            />
            <span
              style={{
                fontSize: 'clamp(1.15rem, 3.5vw, 1.35rem)',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-0.5px'
              }}
            >
              SkillBridge
            </span>
          </Link>

          {/* Navigation Links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(8px, 2vw, 14px)'
          }}>
            <Link
              to="/updates"
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Updates
            </Link>
            <Link
              to="/login"
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                background: 'var(--fb-blue-subtle)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '38px'
              }}
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(165deg, var(--bg-base) 0%, var(--fb-blue-subtle) 100%)',
        padding: 'clamp(44px, 7vw, 76px) 20px clamp(52px, 8vw, 84px)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          

          <h1 style={{
            fontSize: 'clamp(1.9rem, 6vw, 3.1rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: '1.18',
            marginBottom: '18px',
            letterSpacing: '-0.7px'
          }}>
            Your Next Opportunity
            <br />
            <span style={{ color: 'var(--fb-blue)' }}>
              Starts Here
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(0.98rem, 2.2vw, 1.1rem)',
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
            marginBottom: '32px',
            maxWidth: '520px',
            margin: '0 auto 32px'
          }}>
            SkillBridge connects youth in Kakuma Refugee Camp with courses,
            mentorship, and opportunities posted by NGOs and CBOs 
            all in one place.
          </p>

          {/* Hero Action Buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            maxWidth: '460px',
            margin: '0 auto'
          }}>
            {/* Primary Action Button: Get Started */}
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '48px',
                padding: '12px 28px',
                borderRadius: '12px',
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(24, 119, 242, 0.35)',
                transition: 'all 0.2s ease',
                flex: '1 1 180px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              Get Started
            </Link>

            {/* Secondary Action Button: Install App (omitted in standalone mode) */}
            {!isStandalone && !isInstallationComplete && (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isPrompting}
                aria-label={
                  isInstallAvailable
                    ? 'Install App'
                    : 'Show instructions to install App'
                }
                aria-expanded={showInstallGuide}
                aria-controls={showInstallGuide ? 'skillbridge-install-guide' : undefined}
                aria-busy={isPrompting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '48px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '2px solid var(--fb-blue)',
                  background: 'var(--bg-card)',
                  color: 'var(--fb-blue)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: isPrompting ? 'wait' : 'pointer',
                  opacity: isPrompting ? 0.7 : 1,
                  boxShadow: 'var(--card-shadow)',
                  transition: 'all 0.2s ease',
                  flex: '1 1 180px',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {/* Smartphone + Download Icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <path d="M12 18h.01" />
                  <path d="M12 6v6m-2.5-2.5 2.5 2.5 2.5-2.5" />
                </svg>
                <span>{isPrompting ? 'Opening prompt...' : 'Install App'}</span>
              </button>
            )}
          </div>

          {/* Browser Installation Guidance Note */}
          {showInstallGuide && !isStandalone && (
            <div
              id="skillbridge-install-guide"
              role="note"
              style={{
                maxWidth: '460px',
                margin: '18px auto 0',
                padding: '16px 20px',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                textAlign: 'left',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--fb-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {canShowInstallGuide ? 'Install on iPhone or iPad' : 'Install from your browser'}
                </strong>
              </div>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {canShowInstallGuide
                  ? 'On iPhone or iPad, open this page in Safari, tap Share, then choose Add to Home Screen.'
                  : 'Open your browser menu and look for Install app or Add to Home screen. If your browser does not offer installation, you can continue using SkillBridge here.'}
              </p>
            </div>
          )}

          {/* User Feedback Message */}
          {installMessage && !isStandalone && (
            <p
              role="status"
              aria-live="polite"
              style={{
                marginTop: '14px',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem'
              }}
            >
              {installMessage}
            </p>
          )}

          {/* If already installed and not running in standalone */}
          {isInstallationComplete && !isStandalone && (
            <p
              role="status"
              style={{
                marginTop: '14px',
                color: 'var(--success-text)',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              SkillBridge is installed on this device.
            </p>
          )}
        </div>
      </section>

      {/* The Problem */}
      <section style={{
        background: 'var(--bg-section-alt)',
        padding: '72px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            The Problem We're Solving
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.8'
          }}>
            In Kakuma, courses and opportunities are announced through street
            posters that get torn down, WhatsApp messages that get buried, and
            Facebook posts that not everyone sees. Talented youth miss life-changing
            opportunities simply because they didn't hear about them in time.
            <br /><br />
            <strong style={{ color: 'var(--text-primary)' }}>
              SkillBridge fixes that.
            </strong>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--fb-blue-subtle) 100%)',
        padding: '72px 24px'
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: '56px'
          }}>
            How It Works
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '32px'
          }}>
            {[
              {
                number: '1',
                title: 'Create Your Account',
                desc: 'Register as a youth or organisation in under 2 minutes'
              },
              {
                number: '2',
                title: 'Explore Opportunities',
                desc: 'Browse courses posted by verified NGOs and CBOs in Kakuma'
              },
              {
                number: '3',
                title: 'Apply Directly',
                desc: 'Submit your application inside SkillBridge — no WhatsApp needed'
              },
              {
                number: '4',
                title: 'Track Everything',
                desc: 'Get notified when you are shortlisted, accepted or rejected'
              }
            ].map((step, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: 'var(--fb-blue)',
                  opacity: 0.6,
                  marginBottom: '12px'
                }}>
                  {step.number}
                </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6'
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Youth / For Orgs */}
      <section style={{ padding: '72px 24px', background: 'var(--bg-base)' }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '60px'
        }}>
          {/* Youth */}
          <div>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '20px',
              borderBottom: '3px solid var(--fb-blue)',
              paddingBottom: '12px',
              display: 'inline-block'
            }}>
              For Youth
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.8',
              marginBottom: '28px',
              marginTop: '16px'
            }}>
              Whether you're a refugee or host community youth — SkillBridge
              gives you one place to find every course, training, and
              opportunity available in Kakuma. Apply, track, and get notified.
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '28px'
            }}>
              {[
                'Browse all available courses',
                'Apply directly from the platform',
                'Track your application status',
                'Get notified when shortlisted'
              ].map((item, i) => (
                <li key={i} style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  padding: '10px 0',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ color: 'var(--fb-blue)', fontWeight: '700', marginTop: '2px' }}>{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" style={{
              display: 'inline-block',
              background: 'var(--fb-blue)',
              color: 'var(--text-on-primary)',
              padding: '12px 28px',
              borderRadius: 'var(--radius)',
              fontSize: '0.95rem',
              fontWeight: '700',
              textDecoration: 'none'
            }}>
              Register as Youth
            </Link>
          </div>

          {/* Organisations */}
          <div>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '20px',
              borderBottom: '3px solid var(--fb-blue)',
              paddingBottom: '12px',
              display: 'inline-block'
            }}>
              For Organisations
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.8',
              marginBottom: '28px',
              marginTop: '16px'
            }}>
              NGOs and CBOs in Kakuma can post courses and opportunities
              directly to verified youth. Manage applications, shortlist
              candidates, and track impact — all from one dashboard.
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '28px'
            }}>
              {[
                'Post courses in minutes',
                'Reach verified Kakuma youth',
                'Manage applications in one place',
                'Shortlist and notify candidates'
              ].map((item, i) => (
                <li key={i} style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  padding: '10px 0',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <span style={{
                    color: 'var(--fb-blue)',
                    fontWeight: '700',
                    marginTop: '2px'
                  }}>{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/org/register" style={{
              display: 'inline-block',
              background: 'var(--fb-blue)',
              color: 'var(--text-on-primary)',
              padding: '12px 28px',
              borderRadius: 'var(--radius)',
              fontSize: '0.95rem',
              fontWeight: '700',
              textDecoration: 'none'
            }}>
              Register Your Organisation
            </Link>
          </div>
        </div>
      </section>

      {/* Impact Dashboard — Secure Donors */}
      <section style={{
        background: 'var(--bg-section-alt)',
        padding: '80px 24px'
      }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--fb-blue)',
              marginBottom: '16px',
              letterSpacing: '0.05em'
            }}>
              For Organisations
            </h3>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              lineHeight: '1.25'
            }}>
              Turn Impact Into <span style={{ color: 'var(--fb-blue)' }}>Donor Funding</span>
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              maxWidth: '620px',
              margin: '0 auto'
            }}>
              Donors fund what they can measure. SkillBridge's impact dashboard captures
              every outcome — completion rates, employment, business launches, further
              education — so you walk into your next funding meeting with proof, not promises.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}>

            {/* Mock dashboard preview */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              padding: '24px',
              boxShadow: 'var(--card-shadow)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  Impact Dashboard
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--fb-blue)',
                  fontWeight: '700'
                }}>
                  ● LIVE
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {[
                  { label: 'Youth Trained', value: '1,247', accent: 'var(--fb-blue)' },
                  { label: 'Completion Rate', value: '87%', accent: 'var(--fb-blue)' },
                  { label: 'Employed After', value: '412', accent: 'var(--fb-blue)' },
                  { label: 'Businesses Started', value: '68', accent: 'var(--fb-blue)' }
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-section-alt)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{
                      fontSize: '1.4rem',
                      fontWeight: '800',
                      color: stat.accent,
                      lineHeight: '1.1'
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      marginTop: '4px'
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '10px'
              }}>
                Outcomes by Course
              </div>
              {[
                { name: 'Tailoring Bootcamp', pct: 92 },
                { name: 'Digital Skills', pct: 78 },
                { name: 'Solar Technician', pct: 85 }
              ].map((row, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    <span>{row.name}</span>
                    <span style={{ fontWeight: '700' }}>{row.pct}%</span>
                  </div>
                  <div style={{
                    height: '6px',
                    background: 'var(--bg-section-alt)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${row.pct}%`,
                      height: '100%',
                      background: 'var(--fb-blue)'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Donor-facing benefits */}
            <div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {[
                  {
                    title: 'Export Donor-Ready Reports',
                    desc: 'One-click impact summaries with real numbers — completion, employment, and outcome data — formatted for proposals and grant reports.'
                  },
                  {
                    title: 'Prove Your ROI',
                    desc: 'Show donors exactly how every shilling translates into trained youth, jobs created, and lives changed in Kakuma.'
                  },
                  {
                    title: 'Track Long-Term Outcomes',
                    desc: 'Follow youth beyond course completion — employment, businesses started, further education — the metrics funders actually care about.'
                  },
                  {
                    title: 'Stand Out to Funders',
                    desc: 'Most organisations submit promises. With SkillBridge, you submit verified evidence — and win more funding.'
                  }
                ].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '14px 0'
                  }}>
                    <div style={{
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '800'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                      }}>
                        {item.title}
                      </h4>
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6',
                        margin: 0
                      }}>
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/org/register" style={{
                display: 'inline-block',
                marginTop: '28px',
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                padding: '14px 32px',
                borderRadius: 'var(--radius)',
                fontSize: '0.95rem',
                fontWeight: '700',
                textDecoration: 'none'
              }}>
                Unlock Your Impact Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        background: 'linear-gradient(135deg, var(--fb-blue-subtle), var(--bg-section-alt))',
        padding: '72px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            Ready to find your next opportunity?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            marginBottom: '32px'
          }}>
            Join youth and organisations already using SkillBridge in Kakuma.
          </p>
          <Link to="/register" style={{
            background: 'var(--fb-blue)',
            color: 'var(--text-on-primary)',
            padding: '14px 40px',
            borderRadius: 'var(--radius)',
            fontSize: '1rem',
            fontWeight: '800',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--footer-bg)',
        padding: '40px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{
            fontSize: '1.2rem',
            fontWeight: '800',
            color: 'var(--fb-blue)',
            marginBottom: '8px'
          }}>
            SkillBridge
          </p>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--footer-text)',
            marginBottom: '24px'
          }}>
            Connecting Kakuma youth to the opportunities they deserve.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            {[
              { label: 'For Youth', link: '/register' },
              { label: 'For Organisations', link: '/org/register' },
              { label: 'Sign In', link: '/login' }
            ].map((item, i) => (
              <Link key={i} to={item.link} style={{
                fontSize: '0.85rem',
                color: 'var(--footer-text)',
                textDecoration: 'none',
                opacity: 0.7
              }}>
                {item.label}
              </Link>
            ))}
          </div>

          <p style={{
            fontSize: '0.78rem',
            color: 'var(--footer-text)',
            opacity: 0.5
          }}>
            © 2026 SkillBridge. Built for the youth of Kakuma.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
