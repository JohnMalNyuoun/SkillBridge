import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { getPendingOutcomes, submitOutcome } from '../../services/impactService';

const OutcomeForm = () => {
  const navigate = useNavigate();
  const [pendingOutcomes, setPendingOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getPendingOutcomes();
        setPendingOutcomes(res.data);
        const initialAnswers = {};
        res.data.forEach(app => {
          initialAnswers[app._id] = app.course.outcomeQuestions.map(q => ({
            question: q.question,
            answer: ''
          }));
        });
        setAnswers(initialAnswers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAnswerChange = (appId, index, value) => {
    const updated = { ...answers };
    updated[appId][index].answer = value;
    setAnswers(updated);
  };

  const handleSubmit = async (appId) => {
    setSubmitting(appId);
    try {
      await submitOutcome(appId, { outcomeAnswers: answers[appId] });
      setSubmitted([...submitted, appId]);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <Loader />;

  const pending = pendingOutcomes.filter(app => !submitted.includes(app._id));

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '32px 24px'
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Share Your Experience
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            You have completed courses that need your feedback.
            Your answers help organisations improve and secure funding.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {pending.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px'
          }}>
            {submitted.length > 0 ? (
              <div>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '16px'
                }}>
                  🎉
                </div>
                <h2 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Thank you for sharing your experience!
                </h2>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  marginBottom: '24px'
                }}>
                  Your feedback helps organisations in Kakuma improve
                  and secure funding to reach more youth.
                </p>
                <Button onClick={() => navigate('/home')}>
                  Back to Home
                </Button>
              </div>
            ) : (
              <div>
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--text-muted)',
                  marginBottom: '16px'
                }}>
                  No outcome forms pending
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/home')}
                >
                  Back to Home
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {pending.map(app => (
              <div key={app._id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                padding: '32px',
                boxShadow: 'var(--card-shadow)'
              }}>
                <div style={{
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <h2 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {app.course?.title}
                  </h2>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--fb-blue)',
                    fontWeight: '600'
                  }}>
                    {app.organisation?.name}
                  </p>
                </div>

                {app.course.outcomeQuestions.map((q, i) => (
                  <div key={i} style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>
                      {q.question}
                      {q.isRequired && (
                        <span style={{
                          color: 'var(--danger-primary)',
                          marginLeft: '4px'
                        }}>*</span>
                      )}
                    </label>

                    {q.fieldType === 'textarea' ? (
                      <textarea
                        value={answers[app._id]?.[i]?.answer || ''}
                        onChange={(e) => handleAnswerChange(app._id, i, e.target.value)}
                        rows={3}
                        placeholder="Share your experience..."
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius)',
                          resize: 'vertical'
                        }}
                      />
                    ) : q.fieldType === 'yes_no' ? (
                      <select
                        value={answers[app._id]?.[i]?.answer || ''}
                        onChange={(e) => handleAnswerChange(app._id, i, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius)'
                        }}
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    ) : q.fieldType === 'select' ? (
                      <select
                        value={answers[app._id]?.[i]?.answer || ''}
                        onChange={(e) => handleAnswerChange(app._id, i, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius)'
                        }}
                      >
                        <option value="">Select an option</option>
                        {q.options.map((opt, j) => (
                          <option key={j} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={answers[app._id]?.[i]?.answer || ''}
                        onChange={(e) => handleAnswerChange(app._id, i, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                    )}
                  </div>
                ))}

                <Button
                  fullWidth
                  loading={submitting === app._id}
                  onClick={() => handleSubmit(app._id)}
                >
                  Submit Outcome Report
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutcomeForm;