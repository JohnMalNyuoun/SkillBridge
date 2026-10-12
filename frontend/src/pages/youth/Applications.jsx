import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { getMyApplications, withdrawApplication } from '../../services/applicationService';

const statusConfig = {
  submitted: {
    label: 'Submitted',
    color: 'var(--fb-blue-dark)',
    bg: 'var(--fb-blue-subtle)'
  },
  under_review: {
    label: 'Under Review',
    color: 'var(--fb-blue)',
    bg: 'rgba(24, 119, 242, 0.15)'
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'var(--fb-blue)',
    bg: 'rgba(24, 119, 242, 0.2)'
  },
  accepted: {
    label: 'Accepted',
    color: 'var(--success-text)',
    bg: 'var(--success-bg)'
  },
  rejected: {
    label: 'Not Selected',
    color: 'var(--danger-text)',
    bg: 'var(--danger-bg)'
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'var(--text-muted)',
    bg: 'var(--bg-section-alt)'
  }
};

const allStages = ['submitted', 'under_review', 'shortlisted', 'accepted'];
const stageLabels = {
  submitted: 'Application Sent',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted'
};

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);

  const fetchApplications = async () => {
    try {
      const res = await getMyApplications();
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawing(id);
    try {
      await withdrawApplication(id);
      fetchApplications();
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawing(null);
    }
  };

  const getStageIndex = (status) => {
    if (status === 'rejected' || status === 'withdrawn') return -1;
    return allStages.indexOf(status);
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {/* Back */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '14px 20px 0' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 700,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: 'var(--fb-blue)', fontSize: '1rem', lineHeight: 1 }}>←</span>
          <span>Back</span>
        </button>
      </div>

      <div className="fh-container">
        {/* Header */}
        <div style={{ padding: '20px 0 4px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            My Applications
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {applications.length} application{applications.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="fh-empty">
            <p style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              No applications yet
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              Browse courses and apply for ones that interest you
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {applications.map(app => {
              const config = statusConfig[app.status] || statusConfig.submitted;
              const isExpanded = expandedApp === app._id;
              const stageIndex = getStageIndex(app.status);
              const isRejected = app.status === 'rejected';
              const isWithdrawn = app.status === 'withdrawn';
              const timeline = Array.isArray(app.timeline) ? app.timeline : [];

              return (
                <div key={app._id} style={{
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {/* Card header */}
                  <div
                    onClick={() => setExpandedApp(isExpanded ? null : app._id)}
                    style={{
                      padding: '16px 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    {/* Status icon */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: config.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {app.organisation?.logo ? (
                        <img
                          src={app.organisation.logo}
                          alt={app.organisation.name}
                          style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '10px' }}
                        />
                      ) : (
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: config.color,
                          textTransform: 'uppercase'
                        }}>
                          {app.organisation?.name?.[0] ?? '?'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '1.03rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                      }}>
                        {app.course?.title}
                      </h3>

                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--fb-blue)',
                        fontWeight: 600,
                        marginBottom: '2px'
                      }}>
                        {app.organisation?.name}
                      </p>

                      <p style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)'
                      }}>
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Status badge + expand */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        color: config.color,
                        background: config.bg,
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        padding: '6px 10px',
                        borderRadius: '999px',
                        marginBottom: '6px'
                      }}>
                        {config.label}
                      </span>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {isExpanded ? '▲ Less' : '▼ Details'}
                      </p>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid var(--border-color)',
                      padding: '16px 20px 20px'
                    }}>
                      {/* Progress timeline */}
                      {!isRejected && !isWithdrawn && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>
                            Application Progress
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {allStages.map((stage, i) => {
                              const isCompleted = i <= stageIndex;
                              return (
                                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    background: isCompleted ? 'var(--fb-blue)' : 'var(--border-color)',
                                    color: isCompleted ? 'var(--text-on-primary)' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.78rem',
                                    fontWeight: 800
                                  }}>
                                    {i + 1}
                                  </div>
                                  <span style={{
                                    fontSize: '0.76rem',
                                    color: isCompleted ? 'var(--fb-blue)' : 'var(--text-muted)',
                                    fontWeight: 700
                                  }}>
                                    {stageLabels[stage]}
                                  </span>

                                  {/* Connector line */}
                                  {i < allStages.length - 1 && (
                                    <div style={{
                                      width: '26px',
                                      height: '2px',
                                      background: i < stageIndex ? 'var(--fb-blue)' : 'var(--border-color)'
                                    }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rejected / withdrawn message */}
                      {(isRejected || isWithdrawn) && (
                        <div style={{
                          background: isRejected ? 'var(--danger-bg)' : 'var(--bg-section-alt)',
                          borderLeft: `3px solid ${isRejected ? 'var(--danger-primary)' : 'var(--border-color)'}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          marginBottom: '14px'
                        }}>
                          <p style={{
                            color: isRejected ? 'var(--danger-text)' : 'var(--text-muted)',
                            fontSize: '0.84rem',
                            fontWeight: 700
                          }}>
                            {isRejected
                              ? 'Keep trying! The right opportunity is coming.'
                              : 'This application has been withdrawn.'}
                          </p>
                          {isRejected && app.rejectionReason && (
                            <p style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '4px' }}>
                              Reason: {app.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Activity History */}
                      {timeline.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                            Activity History
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {timeline.map((entry, i) => (
                              <div key={`${entry.status}-${entry.timestamp}-${i}`} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '8px 0',
                                borderBottom: i < timeline.length - 1 ? '1px solid var(--border-color)' : 'none'
                              }}>
                                <span style={{ color: 'var(--fb-blue)', fontSize: '0.95rem' }}>•</span>
                                <div>
                                  <p style={{ color: 'var(--text-primary)', fontSize: '0.83rem', fontWeight: 600 }}>
                                    {entry.message}
                                  </p>
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '2px' }}>
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shortlist next step */}
                      {app.status === 'shortlisted' && app.nextStep?.type && (
                        <div style={{
                          background: 'var(--fb-blue-subtle)',
                          borderLeft: '3px solid var(--fb-blue)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          marginBottom: '14px'
                        }}>
                          <p style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--fb-blue)',
                            marginBottom: '4px'
                          }}>
                            Interview Details
                          </p>

                          <p style={{ fontSize: '0.82rem', color: 'var(--fb-blue)' }}>
                            Type: {app.nextStep.type === 'in_person'
                              ? 'In-person interview' : 'Online interview'}
                          </p>

                          {app.nextStep.location && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--fb-blue)' }}>
                              Location: {app.nextStep.location}
                            </p>
                          )}
                          {app.nextStep.scheduledAt && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--fb-blue)' }}>
                              Scheduled: {new Date(app.nextStep.scheduledAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Course details */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '14px'
                      }}>
                        {[
                          {
                            label: 'Location',
                            value: app.course?.location
                          },
                          {
                            label: 'Mode',
                            value: app.course?.deliveryMode?.replace('_', ' ')
                          },
                          {
                            label: 'Starts',
                            value: app.course?.startDate
                              ? new Date(app.course.startDate).toLocaleDateString()
                              : null
                          }
                        ].filter(d => d.value).map((detail) => (
                          <span key={detail.label} style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {detail.label}: {detail.value}
                          </span>
                        ))}
                      </div>

                      {/* Withdraw button */}
                      {['submitted', 'under_review', 'shortlisted'].includes(app.status) && (
                        <Button
                          variant="outline"
                          loading={withdrawing === app._id}
                          onClick={() => handleWithdraw(app._id)}
                          style={{
                            fontSize: '0.82rem',
                            padding: '8px 16px',
                            width: '100%'
                          }}
                        >
                          Withdraw Application
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Applications;