import React, { useEffect, useMemo, useState } from "react";
import { clearToken, me } from "../api/auth";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css"; // ✅ reuse same canva styles

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");

  const currentPath = useMemo(() => location.pathname, [location.pathname]);

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

  const displayName = viewer?.fullName || viewer?.email || "Admin";

  return (
    <div className="canvaShell">
      {/* SIDEBAR */}
      <aside className="canvaSidebar">
        <div
          className="canvaBrand"
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex={0}
        >
          <div className="canvaBrandMark">M</div>
          <div className="canvaBrandText">
            <div className="canvaBrandTitle">Admin</div>
            <div className="canvaBrandSub">Management Panel</div>
          </div>
        </div>

        <nav className="canvaNav">
          <button
            className={`canvaNavItem ${currentPath === "/dashboard" ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className={`canvaNavItem ${currentPath.startsWith("/modules") ? "active" : ""}`}
            onClick={() => navigate("/admin/modules")}
          >
            Modules
          </button>

          <button
            className={`canvaNavItem ${currentPath === "/exam-creation" ? "active" : ""}`}
            onClick={() => navigate("/exam-creation")}
          >
            Exam Creation
          </button>

          <button
            className={`canvaNavItem ${currentPath === "/user-management" ? "active" : ""}`}
            onClick={() => navigate("/user-management")}
          >
            User Management
          </button>

          <button
            className={`canvaNavItem ${currentPath === "/account-management" ? "active" : ""}`}
            onClick={() => navigate("/account-management")}
          >
            Account Management
          </button>

          <div className="canvaNavDivider" />

          <button
            className={`canvaNavItem ${currentPath === "/request-training" ? "active" : ""}`}
            onClick={() => navigate("/request-training")}
          >
            Training Requests
          </button>
        </nav>

        <div className="canvaSidebarFooter">
          <button className="canvaLogout" onClick={logout}>
            Log out
          </button>
          <div className="canvaFooterHint">Version: Prototype</div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="canvaMain">
        <div className="canvaTopbar">
          <div className="canvaTopbarLeft">
            <div className="canvaPageTitle">Admin Dashboard</div>
            <div className="canvaPageSubtitle">Manage modules, users, and exams.</div>
          </div>

          <div className="canvaTopbarRight">
            <div className="canvaUserChip" title={viewer?.email || ""}>
              <div className="canvaAvatar">
                {(displayName || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="canvaUserText">
                <div className="canvaUserName">{displayName}</div>
                <div className="canvaUserMeta">{viewer?.role || "admin"}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="canvaContent">
          <div className="canvaPanel">
            {loading && <div className="canvaState">Loading...</div>}
            {!loading && error && (
              <div className="canvaError">
                {error}
                <div style={{ marginTop: 12 }}>
                  <button className="navButton" onClick={() => navigate("/login")}>
                    Go to Login
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="canvaHero">
                  <div className="canvaHeroTitle">Welcome, {displayName}</div>
                  <div className="canvaHeroDesc">
                    Use this panel to create modules, manage users, and publish exams.
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="canvaGrid">
                  <button className="canvaTile" onClick={() => navigate("/modules")}>
                    <div className="canvaTileHeader">
                      <div className="canvaTileTitle">Modules</div>
                      <div className="canvaPill">Content</div>
                    </div>
                    <div className="canvaTileBody">
                      Create, edit, publish modules and manage drafts.
                    </div>
                    <div className="canvaTileFooter">Open</div>
                  </button>

                  <button className="canvaTile" onClick={() => navigate("/exam-creation")}>
                    <div className="canvaTileHeader">
                      <div className="canvaTileTitle">Exam Creation</div>
                      <div className="canvaPill">Assessment</div>
                    </div>
                    <div className="canvaTileBody">
                      Create and manage exams for applicants.
                    </div>
                    <div className="canvaTileFooter">Open</div>
                  </button>

                  <button className="canvaTile" onClick={() => navigate("/user-management")}>
                    <div className="canvaTileHeader">
                      <div className="canvaTileTitle">User Management</div>
                      <div className="canvaPill">Admin</div>
                    </div>
                    <div className="canvaTileBody">
                      View users, manage roles, and control access.
                    </div>
                    <div className="canvaTileFooter">Open</div>
                  </button>

                  <button className="canvaTile" onClick={() => navigate("/request-training")}>
                    <div className="canvaTileHeader">
                      <div className="canvaTileTitle">Training Requests</div>
                      <div className="canvaPill">Workflow</div>
                    </div>
                    <div className="canvaTileBody">
                      Review training requests and approvals.
                    </div>
                    <div className="canvaTileFooter">Open</div>
                  </button>
                </div>

                {/* INFO ROW */}
                <div className="canvaInfoRow">
                  <div className="canvaInfoCard">
                    <div className="canvaInfoLabel">Account</div>
                    <div className="canvaInfoValue">{viewer?.email}</div>
                  </div>

                  <div className="canvaInfoCard">
                    <div className="canvaInfoLabel">Status</div>
                    <div className="canvaInfoValue">{viewer?.status || "Active"}</div>
                  </div>

                  <div className="canvaInfoCard">
                    <div className="canvaInfoLabel">Role</div>
                    <div className="canvaInfoValue">{viewer?.role || "admin"}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
