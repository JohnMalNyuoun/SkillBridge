import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { createCourse, getOrgCourse, updateCourse } from '../../services/courseService';
import useAuth from '../../hooks/useAuth';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../../utils/formDraftStorage';
import {
  COURSE_CATEGORIES,
  DELIVERY_MODES,
  TARGET_AUDIENCES
} from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const CourseForm = () => {
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  const isEditMode = Boolean(courseId);
  const { user } = useAuth();
  const ownerId = user?._id || user?.id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    targetAudience: '',
    gender: 'both',
    location: 'Kakuma',
    deliveryMode: '',
    startDate: '',
    endDate: '',
    applicationDeadline: '',
    totalSlots: '',
    googleFormLink: '',
    coverImage: null
  });

  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [coverPreview, setCoverPreview] = useState('');
  const [loadedDraftKey, setLoadedDraftKey] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!ownerId) return undefined;
    let active = true;
    const key = `course:${ownerId}:${courseId || 'new'}`;

    const initializeForm = async () => {
      try {
        let initialForm = {
          title: '',
          description: '',
          category: '',
          targetAudience: '',
          gender: 'both',
          location: 'Kakuma',
          deliveryMode: '',
          startDate: '',
          endDate: '',
          applicationDeadline: '',
          totalSlots: '',
          googleFormLink: '',
          coverImage: null
        };
        let initialQuestions = [];
        let initialCoverPreview = '';

        if (isEditMode) {
          const res = await getOrgCourse(courseId);
          const data = res?.data || {};
          initialForm = {
            ...initialForm,
            title: data.title || '',
            description: data.description || '',
            category: data.category || '',
            targetAudience: data.targetAudience || '',
            gender: data.gender || 'both',
            location: data.location || 'Kakuma',
            deliveryMode: data.deliveryMode || '',
            startDate: data.startDate ? String(data.startDate).slice(0, 10) : '',
            endDate: data.endDate ? String(data.endDate).slice(0, 10) : '',
            applicationDeadline: data.applicationDeadline ? String(data.applicationDeadline).slice(0, 10) : '',
            totalSlots: data.totalSlots ? String(data.totalSlots) : '',
            googleFormLink: data.googleFormLink || ''
          };
          initialQuestions = Array.isArray(data.applicationQuestions) ? data.applicationQuestions : [];
          initialCoverPreview = data.coverImage || '';
        }

        let draft = null;
        let draftReadError = '';
        try {
          draft = await loadFormDraft(key);
        } catch (err) {
          draftReadError = err.message || 'Could not check for a saved course draft.';
        }
        if (!active) return;

        if (draft) {
          setForm({ ...initialForm, ...draft.data.form, coverImage: draft.file });
          setQuestions(draft.data.questions || initialQuestions);
          setCoverPreview(draft.file ? URL.createObjectURL(draft.file) : initialCoverPreview);
          setDraftRestored(true);
          setDraftStatus('Your saved draft was restored. It is stored only in this browser.');
        } else {
          setForm(initialForm);
          setQuestions(initialQuestions);
          setCoverPreview(initialCoverPreview);
          setDraftRestored(false);
          setDraftStatus(draftReadError);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || 'Failed to load course');
        }
      } finally {
        if (active) {
          setLoadedDraftKey(key);
          setInitialLoading(false);
        }
      }
    };

    initializeForm();
    return () => {
      active = false;
    };
  }, [courseId, isEditMode, ownerId]);

  useEffect(() => {
    const key = ownerId ? `course:${ownerId}:${courseId || 'new'}` : '';
    if (!key || loadedDraftKey !== key) return undefined;

    const { coverImage, ...formData } = form;
    const timeout = setTimeout(() => {
      setDraftStatus('Saving your draft in this browser...');
      saveFormDraft(key, { form: formData, questions }, coverImage)
        .then(() => setDraftStatus('Draft saved in this browser.'))
        .catch((err) => setDraftStatus(err.message || 'Could not save a local draft.'));
    }, 500);

    return () => clearTimeout(timeout);
  }, [courseId, form, loadedDraftKey, ownerId, questions]);

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === 'file') {
      const nextFile = files?.[0] || null;

      setForm((current) => ({ ...current, [name]: nextFile }));
      setCoverPreview((current) => {
        if (current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return nextFile ? URL.createObjectURL(nextFile) : '';
      });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const buildPayload = () => {
    const payload = new FormData();
    const cleanedQuestions = questions.filter((q) => q.question?.trim());
    const fields = {
      ...form,
      totalSlots: String(parseInt(form.totalSlots, 10)),
      googleFormLink: form.googleFormLink?.trim() || ''
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (key === 'coverImage') return;
      if (value !== '' && value !== null && value !== undefined) {
        payload.append(key, value);
      }
    });

    payload.append('applicationQuestions', JSON.stringify(cleanedQuestions));

    if (form.coverImage) {
      payload.append('coverImage', form.coverImage);
    }

    return payload;
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      fieldType: 'textarea',
      isRequired: true,
      options: []
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode) {
        await updateCourse(courseId, buildPayload());
      } else {
        await createCourse(buildPayload());
      }
      try {
        await clearFormDraft(`course:${ownerId}:${courseId || 'new'}`);
      } catch (draftError) {
        setDraftStatus(`Course saved, but the local draft could not be cleared: ${draftError.message}`);
      }
      navigate('/org/courses');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} course`);
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    marginBottom: '16px'
  };

  if (initialLoading) {
    return (
      <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading course...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>

        <button
          onClick={() => navigate('/org/courses')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--fb-blue)',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '24px',
            padding: 0
          }}
        >
          ← Back to courses
        </button>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          {isEditMode ? 'Edit Course' : 'Post a New Course'}
        </h1>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          marginBottom: '32px'
        }}>
          {isEditMode
            ? 'Update the course details below. Changes are saved to your posted course.'
            : 'Fill in the details below. You can save as draft and publish later.'}
        </p>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: 'var(--radius)',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        )}

        {draftStatus && (
          <p role="status" style={{
            color: draftStatus.startsWith('Could not') ? 'var(--danger-text)' : 'var(--text-muted)',
            fontSize: '0.82rem',
            margin: '-12px 0 20px'
          }}>
            {draftStatus}
            {draftRestored && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await clearFormDraft(`course:${ownerId}:${courseId || 'new'}`);
                    setDraftStatus('');
                    setDraftRestored(false);
                  } catch (err) {
                    setDraftStatus(err.message || 'Could not discard the local draft.');
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--fb-blue)',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  padding: 0
                }}
              >
                Remove local draft
              </button>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit}>

          {/* Basic Info */}
          <div style={{
            padding: '0',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '20px'
            }}>
              Basic Information
            </h2>

            <Input
              label="Course Title"
              name="title"
              placeholder="e.g. Full Stack Web Development"
              value={form.title}
              onChange={handleChange}
              required
            />

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px'
              }}>
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the course, what youth will learn, and any prerequisites"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  resize: 'vertical',
                  marginBottom: '16px'
                }}
              />
            </div>

            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">Select category</option>
              {COURSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div style={{ marginTop: '4px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '6px'
              }}>
                Course Cover Image (Optional)
              </label>
              <input
                type="file"
                name="coverImage"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  marginBottom: coverPreview ? '12px' : '8px'
                }}
              />
              <p style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginBottom: coverPreview ? '12px' : '0'
              }}>
                Upload a JPG, PNG, or WEBP image. It will be stored in MongoDB and shown on the course.
              </p>

              {coverPreview && (
                <img
                  src={resolveImageUrl(coverPreview)}
                  alt="Course cover preview"
                  style={{
                    width: '100%',
                    maxHeight: '220px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)'
                  }}
                />
              )}
            </div>
          </div>

          {/* Targeting */}
          <div style={{
            padding: '0',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '20px'
            }}>
              Target Audience
            </h2>

            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              Who is this course for?
            </label>
            <select
              name="targetAudience"
              value={form.targetAudience}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">Select audience</option>
              {TARGET_AUDIENCES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              style={selectStyle}
            >
              <option value="both">All Genders</option>
              <option value="female">Female Only</option>
              <option value="male">Male Only</option>
            </select>
          </div>

          {/* Logistics */}
          <div style={{
            padding: '0',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '20px'
            }}>
              Logistics
            </h2>

            <Input
              label="Location"
              name="location"
              placeholder="e.g. SIR Centre, Kakuma"
              value={form.location}
              onChange={handleChange}
              required
            />

            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '6px'
            }}>
              Delivery Mode
            </label>
            <select
              name="deliveryMode"
              value={form.deliveryMode}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">Select mode</option>
              {DELIVERY_MODES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
              />
              <Input
                label="End Date"
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Application Deadline"
              type="date"
              name="applicationDeadline"
              value={form.applicationDeadline}
              onChange={handleChange}
              required
            />

            <Input
              label="Total Slots"
              type="number"
              name="totalSlots"
              placeholder="e.g. 20"
              value={form.totalSlots}
              onChange={handleChange}
              required
            />

            <Input
              label="Google Form Link (Optional)"
              type="url"
              name="googleFormLink"
              placeholder="https://docs.google.com/forms/..."
              value={form.googleFormLink}
              onChange={handleChange}
            />

            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginTop: '-8px'
            }}>
              Add the Google Form URL here if applicants should upload CVs, certificates, or extra documents.
            </p>
          </div>

          {/* Application Questions */}
          <div style={{
            padding: '0',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  Application Questions
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {questions.length} question{questions.length !== 1 ? 's' : ''} added
                </p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                style={{
                  background: 'var(--fb-blue-subtle)',
                  color: 'var(--fb-blue)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <div style={{
                padding: '24px',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius)'
              }}>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginBottom: '14px'
                }}>
                  No questions added yet
                </p>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    background: 'var(--fb-blue-subtle)',
                    color: 'var(--fb-blue)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    padding: '9px 14px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Add Your First Question
                </button>
              </div>
            ) : (
              <>
                {questions.map((q, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: 'var(--text-muted)'
                      }}>
                        Question {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger-primary)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Type your question here"
                      value={q.question}
                      onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '10px'
                      }}
                    />

                    <div style={{ marginBottom: q.fieldType === 'select' ? '10px' : '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        marginBottom: '6px'
                      }}>
                        Answer Type
                      </label>
                      <select
                        value={q.fieldType}
                        onChange={(e) => updateQuestion(i, 'fieldType', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card)',
                          border: '1.5px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <option value="textarea">Long text answer</option>
                        <option value="text">Short text answer</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="select">Multiple choice</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                    </div>

                    {q.fieldType === 'select' && (
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: 'var(--text-muted)',
                          marginBottom: '6px'
                        }}>
                          Options (one per line)
                        </label>
                        <textarea
                          placeholder={'Option 1\nOption 2\nOption 3'}
                          value={(q.options || []).join('\n')}
                          onChange={(e) => updateQuestion(
                            i,
                            'options',
                            e.target.value.split('\n').filter(o => o.trim())
                          )}
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            background: 'var(--bg-card)',
                            border: '1.5px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    )}

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) => updateQuestion(i, 'isRequired', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Required question
                    </label>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    background: 'var(--fb-blue-subtle)',
                    color: 'var(--fb-blue)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    padding: '9px 14px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  + Add Another Question
                </button>
              </>
            )}
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {isEditMode ? 'Save Changes' : 'Save as Draft'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CourseForm;