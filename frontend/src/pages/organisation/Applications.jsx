import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import {
  getOrgApplications,
  shortlistApplicant,
  acceptApplicant,
  rejectApplicant
} from '../../services/applicationService';
import { getOrgCourses } from '../../services/courseService';
import { resolveImageUrl } from '../../utils/imageUrl';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [shortlistForm, setShortlistForm] = useState({
    shortlistNote: '',
    nextStep: {
      type: 'in_person',
      location: '',
      scheduledAt: ''
    }
  });
  const [rejectForm, setRejectForm] = useState({ rejectionReason: '' });
  const [modal, setModal] = useState(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filterCourse) params.courseId = filterCourse;
      if (filterStatus) params.status = filterStatus;

      const [appsRes, coursesRes] = await Promise.all([
        getOrgApplications(params),
        getOrgCourses()
      ]);
      setApplications(appsRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCourse, filterStatus]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const handleShortlist = async () => {
    setActionLoading('shortlist');
    try {
      await shortlistApplicant(selectedApp._id, {
        shortlistNote: shortlistForm.shortlistNote,
        nextStep: {
          type: shortlistForm.nextStep.type,
          location: shortlistForm.nextStep.location,
          scheduledAt: shortlistForm.nextStep.scheduledAt
        }
      });
      setModal(null);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id) => {
    if (!window.confirm('Accept this applicant?')) return;
    setActionLoading(id + '_accept');
    try {
      await acceptApplicant(id);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await rejectApplicant(selectedApp._id, {
        rejectionReason: rejectForm.rejectionReason
      });
      setModal(null);
      setSelectedApp(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div className="fh-section-head">
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Applications
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Review and manage all applications to your courses
          </p>
        </div>
      </div>

      <div className="fh-container">

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              minWidth: '200px'
            }}
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              minWidth: '160px'
            }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <span style={{
            marginLeft: 'auto',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            alignSelf: 'center'
          }}>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p style={{ fontSize: '1.1rem' }}>No applications yet</p>
          </div>
        ) : (
          <div>
            {applications.map(app => {
              const applicantName = app.youth?.fullName || 'Applicant';
              const applicantInitial = applicantName.charAt(0).toUpperCase();
              const canReview = app.status === 'submitted' || app.status === 'under_review';
              const canAccept = app.status === 'shortlisted';

              return (
                <div key={app._id} data-testid="application-row" style={{
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {app.youth?.photo ? (
                        <img
                          src={resolveImageUrl(app.youth.photo)}
                          alt={`${applicantName} profile`}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'var(--fb-blue-subtle)',
                          color: 'var(--fb-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          flexShrink: 0
                        }}>
                          {applicantInitial}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            margin: 0
                          }}>
                            <Link
                              to={`/profiles/youth/${app.youth?._id}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {applicantName}
                            </Link>
                          </h3>
                          {app.status !== 'submitted' && (
                            <span className={`fh-badge fh-badge-${app.status}`}>
                              {app.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          overflowWrap: 'anywhere',
                          margin: '3px 0 0'
                        }}>
                          {[app.youth?.email, app.youth?.communityType?.replace('_', ' ')]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <p style={{
                          fontSize: '0.82rem',
                          color: 'var(--fb-blue)',
                          fontWeight: 700,
                          margin: '7px 0 0'
                        }}>
                          {app.course?.title || 'Course application'}
                        </p>
                        <p style={{
                          fontSize: '0.76rem',
                          color: 'var(--text-muted)',
                          margin: '2px 0 0'
                        }}>
                          Applied {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {app.answers && app.answers.length > 0 && (
                    <details style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <summary style={{
                        color: 'var(--fb-blue)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}>
                        Review application answers ({app.answers.length})
                      </summary>
                      <div style={{
                        borderLeft: '2px solid var(--border-color)',
                        padding: '8px 0 2px 12px',
                        marginTop: '8px'
                      }}>
                        {app.answers.map((a, i) => (
                          <div key={i} style={{ marginBottom: i < app.answers.length - 1 ? '12px' : 0 }}>
                            <p style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              marginBottom: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {a.question}
                            </p>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {a.answer || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {app.status === 'shortlisted' && app.nextStep?.type && (
                    <div style={{
                      background: 'var(--fb-blue-subtle)',
                      borderLeft: '3px solid var(--fb-blue)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginTop: '12px',
                      fontSize: '0.82rem',
                      color: 'var(--fb-blue)'
                    }}>
                      Next step: {app.nextStep.type} ·{' '}
                      {app.nextStep.location} ·{' '}
                      {app.nextStep.scheduledAt &&
                        new Date(app.nextStep.scheduledAt).toLocaleString()
                      }
                    </div>
                  )}

                  {canReview ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '8px',
                      marginTop: '14px'
                    }}>
                      <Button
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('shortlist');
                        }}
                        fullWidth
                        style={{ minWidth: 0, minHeight: '42px', fontSize: '0.86rem', padding: '8px 6px', borderRadius: '8px' }}
                      >
                        Shortlist
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('reject');
                        }}
                        fullWidth
                        style={{
                          minWidth: 0,
                          minHeight: '42px',
                          fontSize: '0.86rem',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : canAccept ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '8px',
                      marginTop: '14px'
                    }}>
                      <Button
                        loading={actionLoading === app._id + '_accept'}
                        onClick={() => handleAccept(app._id)}
                        fullWidth
                        style={{ minWidth: 0, minHeight: '42px', fontSize: '0.86rem', padding: '8px 6px', borderRadius: '8px' }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('reject');
                        }}
                        fullWidth
                        style={{
                          minWidth: 0,
                          minHeight: '42px',
                          fontSize: '0.86rem',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shortlist Modal */}
      {modal === 'shortlist' && selectedApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Shortlist {selectedApp.youth?.fullName}
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '24px'
            }}>
              Add next step details for the applicant
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px'
              }}>
                Interview Type
              </label>
              <select
                value={shortlistForm.nextStep.type}
                onChange={(e) => setShortlistForm({
                  ...shortlistForm,
                  nextStep: { ...shortlistForm.nextStep, type: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '12px'
                }}
              >
                <option value="in_person">In Person</option>
                <option value="online">Online</option>
              </select>

              <input
                type="text"
                placeholder="Location or meeting link"
                value={shortlistForm.nextStep.location}
                onChange={(e) => setShortlistForm({
                  ...shortlistForm,
                  nextStep: { ...shortlistForm.nextStep, location: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '12px'
                }}
              />

              <input
                type="datetime-local"
                value={shortlistForm.nextStep.scheduledAt}
                onChange={(e) => setShortlistForm({
                  ...shortlistForm,
                  nextStep: { ...shortlistForm.nextStep, scheduledAt: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '12px'
                }}
              />

              <textarea
                placeholder="Internal note (optional)"
                value={shortlistForm.shortlistNote}
                onChange={(e) => setShortlistForm({
                  ...shortlistForm,
                  shortlistNote: e.target.value
                })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                fullWidth
                loading={actionLoading === 'shortlist'}
                onClick={handleShortlist}
              >
                Confirm Shortlist
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => { setModal(null); setSelectedApp(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modal === 'reject' && selectedApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Reject {selectedApp.youth?.fullName}
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '24px'
            }}>
              Provide a reason so the applicant understands
            </p>

            <textarea
              placeholder="Reason for rejection"
              value={rejectForm.rejectionReason}
              onChange={(e) => setRejectForm({ rejectionReason: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                resize: 'vertical',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                fullWidth
                variant="danger"
                loading={actionLoading === 'reject'}
                onClick={handleReject}
              >
                Confirm Reject
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => { setModal(null); setSelectedApp(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;