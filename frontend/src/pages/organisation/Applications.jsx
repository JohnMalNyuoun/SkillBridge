import { useState, useEffect } from 'react';
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [filterCourse, filterStatus]);

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
              return (
                <div key={app._id} style={{
                  padding: '20px 0',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {/* Top row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {app.youth?.photo ? (
                        <img
                          src={resolveImageUrl(app.youth.photo)}
                          alt={app.youth?.fullName || 'Youth'}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--fb-blue)',
                          color: 'var(--text-on-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem'
                        }}>
                          {(app.youth?.fullName || 'Y').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                      <h3 style={{
                        fontSize: '1.05rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '2px'
                      }}>
                        <Link
                          to={`/profiles/youth/${app.youth?._id}`}
                          style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                        >
                          {app.youth?.fullName}
                        </Link>
                      </h3>
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)'
                      }}>
                        {app.youth?.email} · {app.youth?.communityType?.replace('_', ' ')}
                      </p>
                    </div>
                    </div>

                    <span className={`fh-badge fh-badge-${app.status}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Course */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--fb-blue)',
                    fontWeight: '600',
                    marginBottom: '12px'
                  }}>
                    {app.course?.title}
                  </p>

                  {/* Answers */}
                  {app.answers && app.answers.length > 0 && (
                    <div style={{
                      borderLeft: '2px solid var(--border-color)',
                      padding: '4px 0 4px 12px',
                      marginBottom: '16px'
                    }}>
                      {app.answers.map((a, i) => (
                        <div key={i} style={{ marginBottom: i < app.answers.length - 1 ? '12px' : 0 }}>
                          <p style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {a.question}
                          </p>
                          <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)'
                          }}>
                            {a.answer || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shortlist next step info */}
                  {app.status === 'shortlisted' && app.nextStep?.type && (
                    <div style={{
                      background: 'var(--fb-blue-subtle)',
                      borderLeft: '3px solid var(--fb-blue)',
                      borderRadius: 'var(--radius)',
                      padding: '12px',
                      marginBottom: '16px',
                      fontSize: '0.85rem',
                      color: 'var(--fb-blue)'
                    }}>
                      Next step: {app.nextStep.type} ·{' '}
                      {app.nextStep.location} ·{' '}
                      {app.nextStep.scheduledAt &&
                        new Date(app.nextStep.scheduledAt).toLocaleString()
                      }
                    </div>
                  )}

                  {/* Applied date */}
                  <p style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginBottom: '16px'
                  }}>
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  {app.status === 'submitted' || app.status === 'under_review' ? (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <Button
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('shortlist');
                        }}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Shortlist
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('reject');
                        }}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : app.status === 'shortlisted' ? (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <Button
                        loading={actionLoading === app._id + '_accept'}
                        onClick={() => handleAccept(app._id)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setSelectedApp(app);
                          setModal('reject');
                        }}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
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