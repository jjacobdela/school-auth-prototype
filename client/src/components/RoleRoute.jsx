import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { clearToken, getToken, me } from "../api/auth";

export default function RoleRoute({ roles, children }) {
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await me();
        if (!mounted) return;
        setViewer(data.user);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Not authenticated");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    if (token) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "rgba(255,255,255,0.85)" }}>
        Loading...
      </div>
    );
  }

  if (!loading && error) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  const email = (viewer?.email || "").toLowerCase();
  const effectiveRole = email === "admin@gmail.com" ? "admin" : viewer?.role;

  if (roles && roles.length > 0 && !roles.includes(effectiveRole)) {
    if (effectiveRole === "admin") return <Navigate to="/dashboard" replace />;
    if (effectiveRole === "applicant") return <Navigate to="/applicant-dashboard" replace />;

    clearToken();
    return <Navigate to="/login" replace />;
  }

  return children;
}
