import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getModules } from "../api/modules";
import { requestTraining } from "../api/trainingRequests";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default function RequestTraining() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // form fields
  const [moduleId, setModuleId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [justification, setJustification] = useState("");

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

  // ✅ Only allow published modules
  const publishedModules = useMemo(() => {
    return (modules || []).filter(
      (m) => String(m.status || "draft").toLowerCase() === "published"
    );
  }, [modules]);

  const noPublished = !loading && publishedModules.length === 0;

  const canSubmit =
    !loading &&
    !submitting &&
    !noPublished &&
    moduleId &&
    fullName.trim() &&
    isValidEmail(email) &&
    contact.trim() &&
    company.trim() &&
    justification.trim();

  async function submit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError("");

      await requestTraining({
        moduleId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        contact: contact.trim(),
        company: company.trim(),
        justification: justification.trim(),
      });

      alert("Request sent. The client will receive an email with access details.");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="examPage">
      {/* HEADER */}
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark">MB</div>
          <div className="brandText">
            <div className="brandTitle">Request Training</div>
            <div className="brandSubtitle">
              Choose a published module and enter client details
            </div>
          </div>
        </div>

        <div className="appHeaderRight">
          <button className="navButton" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <button className="navButton primary" disabled={!canSubmit} onClick={submit}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </header>

      <div className="examContent" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="examCard">
          <div className="section">
            {loading && <div className="hintBox">Loading modules...</div>}
            {error && <div className="error">{error}</div>}

            {noPublished ? (
              <div className="emptyState">
                <div className="emptyTitle">No published modules available</div>
                <div className="emptyText">Ask an admin to publish a module first.</div>
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
                        {m.title || "(Untitled)"} {m.pagesCount != null ? `• ${m.pagesCount} pages` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="label">
                    Full Name
                    <input
                      className="input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading || submitting}
                      placeholder="Juan Dela Cruz"
                    />
                  </label>

                  <label className="label">
                    Email
                    <input
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || submitting}
                      placeholder="client@company.com"
                    />
                  </label>

                  <label className="label">
                    Contact Number
                    <input
                      className="input"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      disabled={loading || submitting}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </label>

                  <label className="label">
                    Company
                    <input
                      className="input"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={loading || submitting}
                      placeholder="ACME Corp"
                    />
                  </label>
                </div>

                <label className="label">
                  Justification
                  <textarea
                    className="input textarea"
                    rows={5}
                    placeholder="Why do they need this training?"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    disabled={loading || submitting}
                  />
                </label>

                <div className="hintBox" style={{ marginTop: 10 }}>
                  Only <b>Published</b> modules appear here. Submission will email the client access info and limit their account
                  to the selected module.
                </div>

                {!isValidEmail(email) && email.trim() ? (
                  <div className="error" style={{ marginTop: 10 }}>
                    Please enter a valid email address.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
