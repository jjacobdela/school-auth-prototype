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
    <div className="page">
      <div className="card">
        <h1 className="title">Welcome back</h1>
        <p className="subtitle">Log in to continue.</p>

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

        <p className="footerText">
          No account yet? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
