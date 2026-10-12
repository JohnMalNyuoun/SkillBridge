import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Loader from "../../components/common/Loader";
import { getCourseOutcomes } from "../../services/impactService";

const CourseOutcomes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getCourseOutcomes(id);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <Loader />;
  if (!data) return <div>Not found</div>;

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Navbar />

      <div
        style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}
      >
        <button
          onClick={() => navigate("/org/impact")}
          style={{
            background: "none",
            border: "none",
            color: "var(--fb-blue)",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: "pointer",
            marginBottom: "24px",
            padding: 0,
          }}
        >
          ← Back to Impact Dashboard
        </button>

        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: "800",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Outcome Reports
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            marginBottom: "32px",
          }}
        >
          {data.course.title} · {data.outcomes.length} responses
        </p>

        {data.outcomes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 24px",
              color: "var(--text-muted)",
            }}
          >
            <p>No outcome reports submitted yet</p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {data.outcomes.map((outcome) => (
              <div
                key={outcome._id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
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
                      {outcome.youth?.fullName}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {outcome.youth?.communityType?.replace("_", " ")} ·{" "}
                      {outcome.youth?.gender}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {new Date(outcome.outcomeSubmittedAt).toLocaleDateString()}
                  </span>
                </div>

                {outcome.outcomeAnswers.map((answer, j) => (
                  <div
                    key={j}
                    style={{
                      marginBottom:
                        j < outcome.outcomeAnswers.length - 1 ? "16px" : 0,
                      paddingBottom:
                        j < outcome.outcomeAnswers.length - 1 ? "16px" : 0,
                      borderBottom:
                        j < outcome.outcomeAnswers.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {answer.question}
                    </p>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-primary)",
                        lineHeight: "1.6",
                      }}
                    >
                      {answer.answer || "—"}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseOutcomes;
