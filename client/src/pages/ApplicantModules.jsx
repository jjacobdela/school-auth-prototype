import React, { useEffect, useMemo, useState } from "react";
import { clearToken, me } from "../api/auth";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";

export default function ApplicantModules() {
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

        setViewer(data.user);

        if (data.user?.role !== "applicant") {
          navigate("/dashboard", { replace: true });
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

  const displayName = viewer?.fullName || viewer?.email || "Applicant";

  return (
    <div className="canvaShell">
      <aside className="canvaSidebar">
        <div className="canvaBrand" onClick={() => navigate("/applicant-dashboard")} role="button" tabIndex={0}>
          <div className="canvaBrandMark">A</div>
          <div className="canvaBrandText">
            <div className="canvaBrandTitle">Applicant</div>
            <div className="canvaBrandSub">Training Portal</div>
          </div>
        </div>

        <nav className="canvaNav">
          <button
            className={`canvaNavItem ${currentPath === "/applicant-dashboard" ? "active" : ""}`}
            onClick={() => navigate("/applicant-dashboard")}
          >
            Dashboard
          </button>

          <button className={`canvaNavItem ${currentPath === "/modules" ? "active" : ""}`} onClick={() => navigate("/modules")}>
            Modules
          </button>

          <button className={`canvaNavItem ${currentPath === "/exam" ? "active" : ""}`} onClick={() => navigate("/exam")}>
            Exam
          </button>

          <div className="canvaNavDivider" />

          <button
            className={`canvaNavItem ${currentPath === "/account-management" ? "active" : ""}`}
            onClick={() => navigate("/account-management")}
          >
            Account Management
          </button>
        </nav>

        <div className="canvaSidebarFooter">
          <button className="canvaLogout" onClick={logout}>
            Log out
          </button>
          <div className="canvaFooterHint">Version: Prototype</div>
        </div>
      </aside>

      <main className="canvaMain">
        <div className="canvaTopbar">
          <div className="canvaTopbarLeft">
            <div className="canvaPageTitle">Modules</div>
            <div className="canvaPageSubtitle">Assigned training modules will appear here.</div>
          </div>

          <div className="canvaTopbarRight">
            <div className="canvaUserChip" title={viewer?.email || ""}>
              <div className="canvaAvatar">{(displayName || "A").slice(0, 1).toUpperCase()}</div>
              <div className="canvaUserText">
                <div className="canvaUserName">{displayName}</div>
                <div className="canvaUserMeta">{viewer?.status || "Active"}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="canvaContent">
          <div className="canvaPanel">
            {loading && <div className="canvaState">Loading...</div>}
            {!loading && error && <div className="canvaError">{error}</div>}

            {!loading && !error && (
              <>
                <div className="canvaHero">
                  <div className="canvaHeroTitle">Training Modules</div>
                  <div className="canvaHeroDesc">
                    Next step: we’ll fetch assigned modules from the backend and show progress per module.
                  </div>
                </div>

                <div className="canvaEmpty">
                  <div className="canvaEmptyTitle">No modules yet</div>
                  <div className="canvaEmptyDesc">
                    Once modules are assigned to your account, they’ll show up here with status and progress.
                  </div>

                  <div className="canvaEmptyActions">
                    <button className="canvaPrimary" onClick={() => navigate("/exam")}>
                      Go to Exam
                    </button>
                    <button className="canvaSecondary" onClick={() => navigate("/applicant-dashboard")}>
                      Back to Dashboard
                    </button>
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
