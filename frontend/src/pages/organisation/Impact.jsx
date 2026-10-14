import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import { resolveImageUrl } from "../../utils/imageUrl";
import {
  getImpactDashboard,
  markCompletion,
  addOutcomeQuestions,
} from "../../services/impactService";
import { getOrgApplications } from "../../services/applicationService";
import { getOrgCourses } from "../../services/courseService";

const Impact = () => {
  const [stats, setStats] = useState(null);
  const [acceptedApps, setAcceptedApps] = useState([]);
  const [closedCourses, setClosedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [outcomeModal, setOutcomeModal] = useState(null);
  const [outcomeQuestions, setOutcomeQuestions] = useState([
    { question: "", fieldType: "textarea", isRequired: true, options: [] },
  ]);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    try {
      const [statsRes, appsRes, coursesRes] = await Promise.all([
        getImpactDashboard(),
        getOrgApplications({ status: "accepted" }),
        getOrgCourses(),
      ]);
      setStats(statsRes.data);
      setAcceptedApps(appsRes.data);
      setClosedCourses(coursesRes.data.filter((c) => c.status === "closed"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialise = async () => {
      await fetchData();
    };
    initialise();
  }, []);

  const handleMarkCompletion = async (applicationId, status) => {
    setActionLoading(applicationId + status);
    try {
      await markCompletion(applicationId, { completionStatus: status });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddOutcomeQuestions = async () => {
    setActionLoading("outcome");
    try {
      await addOutcomeQuestions(outcomeModal, {
        outcomeQuestions: outcomeQuestions.filter((q) => q.question.trim()),
      });
      setOutcomeModal(null);
      setOutcomeQuestions([
        { question: "", fieldType: "textarea", isRequired: true, options: [] },
      ]);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const addQuestion = () => {
    setOutcomeQuestions([
      ...outcomeQuestions,
      {
        question: "",
        fieldType: "textarea",
        isRequired: true,
        options: [],
      },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...outcomeQuestions];
    updated[index][field] = value;
    setOutcomeQuestions(updated);
  };

  const removeQuestion = (index) => {
    setOutcomeQuestions(outcomeQuestions.filter((_, i) => i !== index));
  };

  if (loading) return <Loader />;

  const tabStyle = (tab) => ({
    padding: "14px 18px",
    fontSize: "0.9rem",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    borderBottom:
      activeTab === tab ? "3px solid var(--fb-blue)" : "3px solid transparent",
    color: activeTab === tab ? "var(--fb-blue)" : "var(--text-muted)",
    background: "transparent",
    whiteSpace: "nowrap",
    flexShrink: 0,
  });

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Navbar />

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--bg-base) 0%, var(--fb-blue) 100%)",
          padding: "32px 20px 36px",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 5vw, 1.6rem)",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: "6px",
              letterSpacing: "-0.3px",
            }}
          >
            Impact Dashboard
          </h1>
          <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Track your organisation's real impact on Kakuma youth
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-color)",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {[
            { key: "overview", label: "Overview" },
            { key: "completion", label: "Mark Completion" },
            { key: "outcomes", label: "Course Outcomes" },
          ].map((tab) => (
            <button
              key={tab.key}
              style={tabStyle(tab.key)}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fh-container">
        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div>
            {/* Main Stats */}
            <div
              className="fh-stats-grid fh-stats-6"
              style={{ marginBottom: "32px" }}
            >
              {[
                {
                  label: "Total Youth Reached",
                  value: stats.applications.total,
                },
                { label: "Accepted", value: stats.applications.accepted },
                { label: "Completed", value: stats.applications.completed },
                { label: "Dropped Out", value: stats.applications.droppedOut },
                { label: "Completion Rate", value: `${stats.completionRate}%` },
                {
                  label: "Outcome Reports",
                  value: stats.applications.outcomeSubmitted,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    padding: "18px 12px",
                    textAlign: "center",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      color: "var(--fb-blue)",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Demographics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {/* Community */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    marginBottom: "20px",
                  }}
                >
                  Community Breakdown
                </h3>
                {[
                  {
                    label: "Refugee Youth",
                    value: stats.demographics.refugee,
                    total: stats.applications.total,
                  },
                  {
                    label: "Host Community",
                    value: stats.demographics.hostCommunity,
                    total: stats.applications.total,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        background: "var(--bg-section-alt)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width:
                            item.total > 0
                              ? `${(item.value / item.total) * 100}%`
                              : "0%",
                          background: "var(--fb-blue)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Gender */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    marginBottom: "20px",
                  }}
                >
                  Gender Breakdown
                </h3>
                {[
                  {
                    label: "Female",
                    value: stats.demographics.female,
                    total: stats.applications.total,
                  },
                  {
                    label: "Male",
                    value: stats.demographics.male,
                    total: stats.applications.total,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        background: "var(--bg-section-alt)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width:
                            item.total > 0
                              ? `${(item.value / item.total) * 100}%`
                              : "0%",
                          background: "var(--fb-blue)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completion Tab */}
        {activeTab === "completion" && (
          <div>
            <div
              style={{
                background: "var(--fb-blue-subtle)",
                borderLeft: "3px solid var(--fb-blue)",
                borderRadius: "var(--radius)",
                padding: "16px",
                marginBottom: "24px",
                fontSize: "0.88rem",
                color: "var(--fb-blue)",
              }}
            >
              Mark accepted youth as completed, dropped out, or not attended.
              Youth marked as completed will be prompted to fill an outcome
              form.
            </div>

            {acceptedApps.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "64px 24px",
                  color: "var(--text-muted)",
                }}
              >
                <p>No accepted applicants yet</p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {acceptedApps.map((app) => (
                  <div
                    key={app._id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius)",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {app.youth?.photo ? (
                        <img
                          src={resolveImageUrl(app.youth.photo)}
                          alt={app.youth?.fullName || "Youth"}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: "var(--fb-blue)",
                            color: "var(--text-on-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.76rem",
                          }}
                        >
                          {(app.youth?.fullName || "Y").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p
                          style={{
                            fontWeight: "700",
                            color: "var(--text-primary)",
                            marginBottom: "2px",
                          }}
                        >
                          <Link
                            to={`/profiles/youth/${app.youth?._id}`}
                            style={{
                              color: "var(--text-primary)",
                              textDecoration: "underline",
                            }}
                          >
                            {app.youth?.fullName}
                          </Link>
                        </p>
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {app.course?.title}
                        </p>
                      </div>
                    </div>

                    {app.completionStatus ? (
                      <span
                        className={`fh-badge fh-badge-${app.completionStatus}`}
                      >
                        {app.completionStatus.replace("_", " ")}
                      </span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {[
                          {
                            status: "completed",
                            label: "Completed",
                            color: "primary",
                          },
                          {
                            status: "dropped_out",
                            label: "Dropped Out",
                            color: "danger",
                          },
                          {
                            status: "not_attended",
                            label: "Not Attended",
                            color: "outline",
                          },
                        ].map((btn) => (
                          <Button
                            key={btn.status}
                            variant={btn.color}
                            loading={actionLoading === app._id + btn.status}
                            onClick={() =>
                              handleMarkCompletion(app._id, btn.status)
                            }
                            style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                          >
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Outcomes Tab */}
        {activeTab === "outcomes" && (
          <div>
            <div
              style={{
                background: "var(--fb-blue-subtle)",
                borderLeft: "3px solid var(--fb-blue)",
                borderRadius: "var(--radius)",
                padding: "16px",
                marginBottom: "24px",
                fontSize: "0.88rem",
                color: "var(--fb-blue)",
              }}
            >
              Add outcome questions to closed courses so youth can share their
              experience after completing.
            </div>

            {closedCourses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "64px 24px",
                  color: "var(--text-muted)",
                }}
              >
                <p>No closed courses yet</p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {closedCourses.map((course) => (
                  <div
                    key={course._id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius)",
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {course.title}
                      </p>
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {course.filledSlots} enrolled · Closed
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                      {!course.outcomeQuestionsAdded ? (
                        <Button
                          onClick={() => setOutcomeModal(course._id)}
                          style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                        >
                          Add Outcome Questions
                        </Button>
                      ) : (
                        <Link to={`/org/courses/${course._id}/outcomes`}>
                          <Button
                            variant="outline"
                            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                          >
                            View Outcomes
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outcome Questions Modal */}
      {outcomeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius)",
              padding: "32px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              Add Outcome Questions
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "24px",
              }}
            >
              These questions will be sent to youth who completed this course
            </p>

            {outcomeQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius)",
                  padding: "16px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "var(--text-muted)",
                    }}
                  >
                    Question {i + 1}
                  </span>
                  {outcomeQuestions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger-primary)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Enter outcome question"
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(i, "question", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius)",
                    marginBottom: "10px",
                  }}
                />

                <select
                  value={q.fieldType}
                  onChange={(e) =>
                    updateQuestion(i, "fieldType", e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <option value="textarea">Long text</option>
                  <option value="text">Short text</option>
                  <option value="yes_no">Yes / No</option>
                  <option value="select">Multiple choice</option>
                </select>
              </div>
            ))}

            <button
              onClick={addQuestion}
              style={{
                background: "var(--fb-blue-subtle)",
                color: "var(--fb-blue)",
                border: "none",
                borderRadius: "var(--radius)",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "700",
                cursor: "pointer",
                marginBottom: "20px",
                width: "100%",
              }}
            >
              + Add Another Question
            </button>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button
                fullWidth
                loading={actionLoading === "outcome"}
                onClick={handleAddOutcomeQuestions}
              >
                Save Questions
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => setOutcomeModal(null)}
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

export default Impact;
