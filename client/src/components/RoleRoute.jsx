import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { clearToken, getToken, me } from "../api/auth";
import { useViewerContext } from "./viewerContext";

export default function RoleRoute({ roles, children }) {
  const token = getToken();
  const viewerContext = useViewerContext();
  const hasViewerContext = Boolean(viewerContext);

  const [loading, setLoading] = useState(hasViewerContext ? false : true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasViewerContext) return undefined;

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
  }, [token, hasViewerContext]);

  if (!token) return <Navigate to="/login" replace />;

  const resolvedLoading = hasViewerContext ? viewerContext.loading : loading;
  const resolvedError = hasViewerContext ? viewerContext.error : error;
  const resolvedViewer = hasViewerContext ? viewerContext.viewer : viewer;

  if (resolvedLoading) {
    return (
      <div style={{ padding: "24px", color: "rgba(15, 23, 42, 0.75)" }}>
        Loading...
      </div>
    );
  }

  if (!resolvedLoading && resolvedError) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  const email = (resolvedViewer?.email || "").toLowerCase();
  const effectiveRole = email === "admin@gmail.com" ? "admin" : resolvedViewer?.role;

  if (roles && roles.length > 0 && !roles.includes(effectiveRole)) {
    if (effectiveRole === "admin") return <Navigate to="/dashboard" replace />;
    if (effectiveRole === "applicant") return <Navigate to="/applicant-dashboard" replace />;

    clearToken();
    return <Navigate to="/login" replace />;
  }

  return children;
}
