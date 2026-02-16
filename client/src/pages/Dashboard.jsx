import React, { useEffect, useState } from "react";
import { clearToken, me } from "../api/auth";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await me();
        if (!mounted) return;

        const user = data.user;
        setViewer(user);

        const email = (user?.email || "").toLowerCase();
        const isAdmin = user?.role === "admin" || email === "admin@gmail.com";

        if (!isAdmin) {
          navigate("/applicant-dashboard", { replace: true });
          return;
        }
      } catch (err) {
        if (mounted) setError(err.message || "Not authenticated");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  // IMPORTANT: Do not render the admin dashboard UI until we know the role.
  if (loading) {
    return (
      <div className="dashboardPage">
        <div className="page">
          <div className="card">
            <h1 className="title">Loading...</h1>
            <p className="subtitle">Checking your access.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && error) {
    clearToken();
    return (
      <div className="dashboardPage">
        <div className="page">
          <div className="card">
            <h1 className="title">Session expired</h1>
            <p className="subtitle">Please log in again.</p>
            <div className="error">{error}</div>
            <button className="button" onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const email = (viewer?.email || "").toLowerCase();
  const isAdmin = viewer?.role === "admin" || email === "admin@gmail.com";

  // If not admin, we already navigated away above, but keep a safety return.
  if (!isAdmin) {
    return (
      <div className="dashboardPage">
        <div className="page">
          <div className="card">
            <h1 className="title">Redirecting...</h1>
            <p className="subtitle">Taking you to your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboardPage">
      <header className="dashboardHeader">
        <button className="navButton" onClick={() => navigate("/request-training")}>
          Request Training Module
        </button>

        <button className="navButton" onClick={() => navigate("/module-creation")}>
          Module Creation
        </button>

        <button className="navButton" onClick={() => navigate("/exam-creation")}>
          Exam Creation
        </button>

        <button className="navButton" onClick={() => navigate("/user-management")}>
          User Management
        </button>

        <button className="navButton" onClick={() => navigate("/account-management")}>
          Account Management
        </button>
      </header>

      <div className="page">
        <div className="card">
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Admin workspace.</p>

          {viewer && (
            <div className="profileBox">
              <div>
                <strong>Name:</strong> {viewer.fullName}
              </div>
              <div>
                <strong>Email:</strong> {viewer.email}
              </div>
              <div>
                <strong>Role:</strong> {viewer.role || "admin"}
              </div>
              <div>
                <strong>Status:</strong> {viewer.status || "Active"}
              </div>
              <div>
                <strong>Created:</strong> {viewer.createdAt ? new Date(viewer.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          )}

          <button className="button secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
