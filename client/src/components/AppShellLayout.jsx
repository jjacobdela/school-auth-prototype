import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { clearToken, me } from "../api/auth";
import { ViewerContext } from "./viewerContext";
import "../styles/appShell.css";

const PAGE_META = [
  {
    patterns: ["/dashboard"],
    title: "Admin Dashboard",
    subtitle: "Operations overview and shortcuts into the admin workspace."
  },
  {
    patterns: ["/user-management"],
    title: "User Management",
    subtitle: "Create applicant accounts, review status, and manage access."
  },
  {
    patterns: ["/exam-creation"],
    title: "Exam Builder",
    subtitle: "Create assessments, manage drafts, and publish live exams."
  },
  {
    patterns: ["/account-management"],
    title: "Account Management",
    subtitle: "Update account details and maintain access settings."
  },
  {
    patterns: ["/request-training"],
    title: "Request Training",
    subtitle: "Submit training requests and track what needs approval."
  },
  {
    patterns: ["/my-training"],
    title: "My Training",
    subtitle: "Review available training content and supporting files."
  },
  {
    patterns: ["/modules/new", "/modules/builder", "/modules/:id/edit"],
    title: "Module Builder",
    subtitle: "Create and refine training modules in one workspace."
  },
  {
    patterns: ["/modules/:id/view"],
    title: "Module Viewer",
    subtitle: "Review published learning content and page structure."
  },
  {
    patterns: ["/modules/create"],
    title: "Create Module",
    subtitle: "Set up a new module and prepare its content."
  },
  {
    patterns: ["/modules/:id/upload"],
    title: "Upload Content",
    subtitle: "Attach files and supporting material to a module."
  },
  {
    patterns: ["/modules", "/applicant/modules"],
    title: "Modules",
    subtitle: "Browse training modules, drafts, and learning material."
  },
  {
    patterns: ["/exam"],
    title: "Exam",
    subtitle: "Assessment status, access, and upcoming submissions."
  },
  {
    patterns: ["/applicant-dashboard"],
    title: "Applicant Dashboard",
    subtitle: "Your training portal for modules, requests, and exams."
  }
];

const ADMIN_NAV = [
  { label: "Dashboard", to: "/dashboard", patterns: ["/dashboard"] },
  { label: "Modules", to: "/modules", patterns: ["/modules", "/modules/*"] },
  { label: "Exams", to: "/exam-creation", patterns: ["/exam-creation"] },
  { label: "Users", to: "/user-management", patterns: ["/user-management"] },
  { label: "Account", to: "/account-management", patterns: ["/account-management"] }
];

const APPLICANT_NAV = [
  { label: "Dashboard", to: "/applicant-dashboard", patterns: ["/applicant-dashboard"] },
  { label: "Modules", to: "/applicant/modules", patterns: ["/applicant/modules", "/modules", "/modules/*"] },
  { label: "Exam", to: "/exam", patterns: ["/exam"] },
  { label: "Requests", to: "/request-training", patterns: ["/request-training"] },
  { label: "Training", to: "/my-training", patterns: ["/my-training"] },
  { label: "Account", to: "/account-management", patterns: ["/account-management"] }
];

function isAdminViewer(viewer) {
  const email = (viewer?.email || "").toLowerCase();
  return viewer?.role === "admin" || email === "admin@gmail.com";
}

function matchesPath(pathname, patterns) {
  return patterns.some((pattern) => matchPath({ path: pattern, end: pattern === pathname }, pathname));
}

function resolveMeta(pathname) {
  return PAGE_META.find((entry) => matchesPath(pathname, entry.patterns)) || PAGE_META[0];
}

export default function AppShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "corporate");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadViewer() {
      try {
        const data = await me();
        if (!mounted) return;
        setViewer(data.user || null);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setViewer(null);
        setError(err.message || "Not authenticated");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadViewer();
    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = useMemo(() => isAdminViewer(viewer), [viewer]);
  const pageMeta = useMemo(() => resolveMeta(location.pathname), [location.pathname]);
  const navItems = loading ? [] : isAdmin ? ADMIN_NAV : APPLICANT_NAV;
  const displayName = viewer?.fullName || viewer?.email || "Workspace";
  const homePath = loading ? "/dashboard" : isAdmin ? "/dashboard" : "/applicant-dashboard";

  if (!loading && error) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  return (
    <ViewerContext.Provider value={{ viewer, loading, error, setViewer }}>
      <div className="appShell">
        <aside className="appShellSidebar">
          <button className="appShellBrand" type="button" onClick={() => navigate(homePath)}>
            <div className="appShellBrandMark">G</div>
            <div className="appShellBrandText">
              <div className="appShellBrandTitle">GO21 Ops</div>
              <div className="appShellBrandSub">
                {loading ? "Loading workspace" : isAdmin ? "Admin Workspace" : "Applicant Workspace"}
              </div>
            </div>
          </button>

          <nav className="appShellNav" aria-label="Primary">
            {navItems.map((item) => {
              const active = matchesPath(location.pathname, item.patterns);
              return (
                <button
                  key={item.to}
                  className={`appShellNavItem ${active ? "active" : ""}`}
                  type="button"
                  onClick={() => navigate(item.to)}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="appShellSidebarFooter">
            <div className="appShellSidebarMeta">
              <div className="appShellSidebarMetaLabel">Signed In</div>
              <div className="appShellSidebarMetaValue">{displayName}</div>
            </div>

            <button
              className="appShellLogout"
              type="button"
              onClick={() => {
                clearToken();
                navigate("/login", { replace: true });
              }}
            >
              Log out
            </button>
          </div>
        </aside>

        <main className="appShellMain">
          <header className="appShellTopbar">
            <div className="appShellTopbarCopy">
              <div className="appShellTopbarTitle">{pageMeta.title}</div>
              <div className="appShellTopbarSubtitle">{pageMeta.subtitle}</div>
            </div>

            <div className="appShellUserChip" title={viewer?.email || ""}>
              <div className="appShellAvatar">{displayName.slice(0, 1).toUpperCase()}</div>
              <div className="appShellUserText">
                <div className="appShellUserName">{displayName}</div>
                <div className="appShellUserMeta">
                  {loading ? "Loading user..." : viewer?.role || "Workspace"}
                </div>
              </div>
            </div>
          </header>

          <div className="appShellRoute">
            <Outlet />
          </div>
        </main>
      </div>
    </ViewerContext.Provider>
  );
}
