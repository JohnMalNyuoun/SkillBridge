import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';

const Organisations = () => {
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [denyModal, setDenyModal] = useState(null);
  const [denyNote, setDenyNote] = useState('');

  const fetchOrganisations = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/admin/organisations', { params });
      setOrganisations(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, [filterStatus]);

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve');
    try {
      await api.put(`/admin/organisations/${id}/approve`);
      fetchOrganisations();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await api.put(`/admin/organisations/${rejectModal}/reject`, { rejectionReason });
      setRejectModal(null);
      setRejectionReason('');
      fetchOrganisations();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setActionLoading('suspend');
    try {
      await api.put(`/admin/organisations/${suspendModal}/suspend`, {
        suspensionReason: suspendReason.trim()
      });
      setSuspendModal(null);
      setSuspendReason('');
      fetchOrganisations();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReinstate = async (id) => {
    if (!window.confirm('Approve reinstatement and return this organisation to active status?')) return;
    setActionLoading(id + '_reinstate');
    try {
      await api.put(`/admin/organisations/${id}/reinstate`);
      fetchOrganisations();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDenyReinstatement = async () => {
    if (!denyNote.trim()) return;
    setActionLoading('deny');
    try {
      await api.put(`/admin/organisations/${denyModal}/deny-reinstatement`, {
        reviewNote: denyNote.trim()
      });
      setDenyModal(null);
      setDenyNote('');
      fetchOrganisations();
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

      <div className="fh-section-head">
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Organisations
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Approve, reject and manage organisations on SkillBridge
          </p>
        </div>
      </div>

      <div className="fh-container">

        {/* Filter */}
        <div style={{ marginBottom: '24px' }}>
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
              minWidth: '180px'
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {organisations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p>No organisations found</p>
          </div>
        ) : (
          <div>
            {organisations.map(org => (
              <div key={org._id} style={{
                borderBottom: org.status === 'pending' ? '2px solid var(--fb-blue)' : '1px solid var(--border-color)',
                padding: '20px 0'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {org.logo ? (
                      <img
                        src={resolveImageUrl(org.logo)}
                        alt={org.name}
                        style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--fb-blue)',
                        color: 'var(--text-on-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem'
                      }}>
                        {(org.name || 'O').charAt(0).toUpperCase()}
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
                        to={`/profiles/organisation/${org._id}`}
                        style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                      >
                        {org.name}
                      </Link>
                    </h3>
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)'
                    }}>
                      {org.type} · {org.location}
                    </p>
                  </div>
                  </div>

                  <span className={`fh-badge fh-badge-${org.status}`}>
                    {org.status}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px',
                  lineHeight: '1.6'
                }}>
                  {org.description}
                </p>

                {/* Suspension + reinstatement context */}
                {org.status === 'suspended' && (
                  <div style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--danger-text)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Suspended
                    </div>
                    {org.suspensionReason && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--danger-text)', marginBottom: '4px' }}>
                        Reason: {org.suspensionReason}
                      </div>
                    )}
                    {org.suspendedAt && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        Since {new Date(org.suspendedAt).toLocaleDateString()}
                      </div>
                    )}
                    {org.reinstatement?.status === 'pending' && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--danger-border)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--fb-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Reinstatement requested
                        </div>
                        {org.reinstatement.requestMessage && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            “{org.reinstatement.requestMessage}”
                          </div>
                        )}
                        {org.reinstatement.requestedAt && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {new Date(org.reinstatement.requestedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    {org.reinstatement?.status === 'denied' && (
                      <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Previous reinstatement denied{org.reinstatement.reviewNote ? `: ${org.reinstatement.reviewNote}` : ''}
                      </div>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📧 {org.email}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📞 {org.phoneNumber}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📅 Registered {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {org.status === 'pending' && (
                    <>
                      <Button
                        loading={actionLoading === org._id + '_approve'}
                        onClick={() => handleApprove(org._id)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setRejectModal(org._id)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {org.status === 'approved' && (
                    <Button
                      variant="outline"
                      onClick={() => setSuspendModal(org._id)}
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      Suspend
                    </Button>
                  )}
                  {org.status === 'suspended' && org.reinstatement?.status === 'pending' && (
                    <>
                      <Button
                        loading={actionLoading === org._id + '_reinstate'}
                        onClick={() => handleReinstate(org._id)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Approve reinstatement
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDenyModal(org._id)}
                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                      >
                        Deny reinstatement
                      </Button>
                    </>
                  )}
                  {org.status === 'suspended' && org.reinstatement?.status !== 'pending' && (
                    <Button
                      variant="outline"
                      loading={actionLoading === org._id + '_reinstate'}
                      onClick={() => handleReinstate(org._id)}
                      style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                    >
                      Reinstate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
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
              Reject Organisation
            </h2>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '20px'
            }}>
              Provide a reason for rejection
            </p>

            <textarea
              placeholder="Reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
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
                onClick={() => { setRejectModal(null); setRejectionReason(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
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
            maxWidth: '440px'
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Suspend Organisation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              The organisation will be notified and can submit a reinstatement request.
            </p>

            <textarea
              placeholder="Reason for suspension"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
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
                loading={actionLoading === 'suspend'}
                onClick={handleSuspend}
              >
                Confirm Suspend
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Reinstatement Modal */}
      {denyModal && (
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
            maxWidth: '440px'
          }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              Deny Reinstatement
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              The organisation will stay suspended and will be notified of your decision.
            </p>

            <textarea
              placeholder="Reason for denial"
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
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
                loading={actionLoading === 'deny'}
                onClick={handleDenyReinstatement}
              >
                Confirm Denial
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => { setDenyModal(null); setDenyNote(''); }}
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

export default Organisations;