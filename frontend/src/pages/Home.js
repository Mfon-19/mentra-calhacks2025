import React, { useState } from "react";
import "./Home.css";
import { generateLessonPlan } from "../services/apiService";

const Home = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [topic, setTopic] = useState("");
  const [generatedLessons, setGeneratedLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await generateLessonPlan({ topic: topic.trim() });
      setGeneratedLessons(response.data.generated_lesson_plan || []);
      setIsSubmitted(true);
    } catch (err) {
      setError("Failed to generate lesson plan. Please try again.");
      console.error("Error generating lesson plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerChildProcess = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.triggerChildProcess();
      } catch (error) {
        console.error("Error triggering child process: ", error);
      }
    } else {
      console.error("Not running in Electron environment");
    }
  };


  if (isLoading) {
    return (
      <div className="home-container">
        <section className="hero-section">
          <div className="hero-background"></div>
          <div
            style={{
              width: "60%",
              margin: "0 auto",
              padding: "40px 32px 200px",
              textAlign: "center",
            }}>
            <h2
              style={{
                fontSize: 36,
                marginBottom: 40,
                color: "#2d2d2d",
                fontFamily: "inherit",
              }}>
              <i>Generating your lesson plan...</i>
            </h2>
            <div
              style={{
                fontSize: 18,
                color: "#666",
                fontFamily: "inherit",
              }}>
              Please wait while we create your personalized learning path.
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isSubmitted && generatedLessons.length > 0) {
    return (
      <div className="home-container">
        <section className="hero-section">
          <div className="hero-background"></div>
          <div
            style={{
              width: "60%",
              margin: "0 auto",
              padding: "40px 32px 200px",
            }}>
            <h2
              style={{
                fontSize: 36,
                marginBottom: 40,
                color: "#2d2d2d",
                fontFamily: "inherit",
              }}>
              <i>Your personalized lesson plan for "{topic}"</i>
            </h2>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                fontFamily: "inherit",
                color: "#2d2d2d",
              }}>
              {generatedLessons.map((lesson, lessonIndex) => (
                <div
                  key={lesson.id || lessonIndex}
                  style={{
                    marginBottom: 40,
                    padding: "24px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    backgroundColor: "#fafafa",
                  }}>
                  <h3
                    style={{
                      fontSize: 24,
                      marginBottom: 12,
                      color: "#2d2d2d",
                      fontFamily: "inherit",
                    }}>
                    {lesson.lesson_order}. {lesson.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 16,
                      marginBottom: 20,
                      color: "#666",
                      fontFamily: "inherit",
                      fontStyle: "italic",
                    }}>
                    {lesson.description}
                  </p>
                  <ol
                    style={{
                      fontSize: 16,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                      color: "#2d2d2d",
                      paddingLeft: 20,
                    }}>
                    {lesson.steps && lesson.steps.map((step, stepIndex) => (
                      <li
                        key={step.id || stepIndex}
                        style={{
                          marginBottom: 12,
                        }}>
                        <strong>{step.name}</strong>
                        <br />
                        <span style={{ color: "#666" }}>{step.description}</span>
                        {step.finish_criteria && (
                          <>
                            <br />
                            <span style={{ color: "#888", fontSize: "14px" }}>
                              <em>Goal: {step.finish_criteria}</em>
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "24px 32px",
            background: "transparent",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            gap: "16px",
          }}>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setGeneratedLessons([]);
              setTopic("");
              setError(null);
            }}
            style={{
              height: 72,
              padding: "0 40px",
              borderRadius: 40,
              border: "1.5px solid #3b82f6",
              background: "transparent",
              color: "#3b82f6",
              fontWeight: 600,
              fontSize: 20,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#3b82f6";
              e.target.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#3b82f6";
            }}>
            New Topic
          </button>
          <button
            onClick={handleTriggerChildProcess}
            style={{
              height: 72,
              padding: "0 80px",
              borderRadius: 40,
              border: "none",
              background: "#3b82f6",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 20,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#2563eb";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#3b82f6";
              e.target.style.transform = "scale(1)";
            }}>
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Learn <i>Anything</i> Fast
          </h1>
        </div>
      </section>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "24px 32px",
          background: "transparent",
          zIndex: 1000,
        }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            position: "relative",
          }}>
          {error && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                marginBottom: "12px",
                padding: "12px 20px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "14px",
                textAlign: "center",
              }}>
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Ask anything"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              width: "100%",
              height: 144,
              padding: "0 180px 0 28px",
              borderRadius: 80,
              border: "1.5px solid rgba(0,0,0,0.12)",
              outline: "none",
              fontSize: 18,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
              e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(0,0,0,0.12)";
              e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              height: 112,
              width: 112,
              borderRadius: "50%",
              border: "none",
              background: isLoading ? "#9ca3af" : "#3b82f6",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 24,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = "#2563eb";
                e.target.style.transform = "translateY(-50%) scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.background = "#3b82f6";
                e.target.style.transform = "translateY(-50%) scale(1)";
              }
            }}>
            {isLoading ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
