import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, setToken } from "../api/auth";
import "../styles/form.css";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedIdentifier = identifier.trim();
      const isEmail = normalizedIdentifier.includes("@");
      const data = await login({
        email: isEmail ? normalizedIdentifier : "",
        username: isEmail ? "" : normalizedIdentifier,
        password
      });
      setToken(data.token);

      const viewer = data?.user || null;
      const viewerEmail = (viewer?.email || normalizedIdentifier || "").toLowerCase();
      const isAdmin = viewer?.role === "admin" || viewerEmail === "admin@gmail.com";

      if (isAdmin) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/applicant-dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page authPage">
      <div className="authShell">
        <section className="authShowcase">
          <div className="authKicker">GO21 Ops</div>
          <h1 className="authHeadline">Training, modules, and assessments in one workspace.</h1>
          <p className="authBody">
            Sign in to manage learning content, publish exams, and keep training operations organized in a cleaner corporate workflow.
          </p>

          <div className="authFeatureGrid">
            <div className="authFeatureCard">
              <div className="authFeatureLabel">Modules</div>
              <div className="authFeatureValue">Structured lessons with text, PDF, and video content.</div>
            </div>

            <div className="authFeatureCard">
              <div className="authFeatureLabel">Assessments</div>
              <div className="authFeatureValue">Exam publishing and final module checks from the same system.</div>
            </div>

            <div className="authFeatureCard">
              <div className="authFeatureLabel">Access</div>
              <div className="authFeatureValue">Role-based workspaces for admins, teachers, and applicants.</div>
            </div>

            <div className="authFeatureCard">
              <div className="authFeatureLabel">Workflow</div>
              <div className="authFeatureValue">One place for sign-in, authoring, approvals, and training records.</div>
            </div>
          </div>
        </section>

        <div className="card authCard">
          <div className="authCardBadge">Secure Sign In</div>
          <h1 className="title">Welcome back</h1>
          <p className="subtitle">Log in to continue to the GO21 workspace.</p>

          <form onSubmit={onSubmit} className="form">
            <label className="label">
              Email or username
              <input
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin or you@school.edu"
                autoComplete="username"
                type="text"
                required
              />
            </label>

            <label className="label">
              Password
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                type="password"
                required
              />
            </label>

            {error ? <div className="error">{error}</div> : null}

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="authHelperText">Use your email or assigned username to access the system.</p>

          <p className="footerText">
            No account yet? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
