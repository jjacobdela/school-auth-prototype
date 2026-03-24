import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getModules } from "../api/modules";
import { requestTraining } from "../api/trainingRequests";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

export default function RequestTraining() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [moduleId, setModuleId] = useState("");
  const [justification, setJustification] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    async function loadModules() {
      try {
        setError("");
        setLoading(true);
        const res = await getModules();
        setModules(res.data || []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, []);

  // ✅ Only allow published modules to be selected
  const publishedModules = useMemo(() => {
    return (modules || []).filter(
      (m) => String(m.status || "draft").toLowerCase() === "published"
    );
  }, [modules]);

  async function submit() {
    if (!moduleId || !justification.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      await requestTraining({ moduleId, justification: justification.trim() });
      alert("Request sent");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const noPublished = !loading && publishedModules.length === 0;

  return (
    <div className="examPage">
      {/* HEADER (matches ModuleBuilder style) */}
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark">MB</div>
          <div className="brandText">
            <div className="brandTitle">Request Training</div>
            <div className="brandSubtitle">Choose a published module and explain why you need it</div>
          </div>
        </div>

        <div className="appHeaderRight">
          <button className="navButton" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <button
            className="navButton primary"
            disabled={
              submitting ||
              loading ||
              noPublished ||
              !moduleId ||
              !justification.trim()
            }
            onClick={submit}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </header>

      <div
        className="examContent"
        style={{ maxWidth: 900, margin: "0 auto" }}
      >
        <div className="examCard">
          <div className="section">
            {loading && <div className="hintBox">Loading modules...</div>}
            {error && <div className="error">{error}</div>}

            {noPublished ? (
              <div className="emptyState">
                <div className="emptyTitle">No published modules available</div>
                <div className="emptyText">
                  Ask an admin to publish a module first.
                </div>
              </div>
            ) : (
              <>
                <label className="label">
                  Module (Published only)
                  <select
                    className="input"
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    disabled={loading || submitting || noPublished}
                  >
                    <option value="">Select module</option>
                    {publishedModules.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.title || "(Untitled)"}{" "}
                        {m.lessonsCount != null || m.resourcesCount != null
                          ? `• ${m.lessonsCount || 0} lessons / ${m.resourcesCount || m.pagesCount || 0} resources`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="label">
                  Justification
                  <textarea
                    className="input textarea"
                    rows={5}
                    placeholder="Why do you need this training?"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    disabled={loading || submitting || noPublished}
                  />
                </label>

                <div className="hintBox" style={{ marginTop: 10 }}>
                  Only <b>Published</b> modules appear here. Draft modules cannot be requested.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
