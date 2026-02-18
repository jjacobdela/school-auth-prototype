import React, { useEffect, useMemo, useState } from "react";
import { clearToken, me, getToken } from "../api/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { listPublishedExams } from "../api/exams";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";
import "../styles/adminDashboard.css";

const API_BASE = "http://localhost:5001/api";
const EXAM_DRAFTS_KEY = "exam_drafts_v1";

async function apiGet(path) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function safeParseJSON(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readExamDraftsCount() {
  const raw = localStorage.getItem(EXAM_DRAFTS_KEY);
  const parsed = raw ? safeParseJSON(raw, []) : [];
  return Array.isArray(parsed) ? parsed.length : 0;
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const [publishedExams, setPublishedExams] = useState([]);
  const [users, setUsers] = useState([]);

  const currentPath = useMemo(() => location.pathname, [location.pathname]);

  const isAdmin = useMemo(() => {
    const email = (viewer?.email || "").toLowerCase();
    return viewer?.role === "admin" || email === "admin@gmail.com";
  }, [viewer]);

  const displayRole = isAdmin ? "admin" : viewer?.role || "applicant";
  const displayName = viewer?.fullName || viewer?.email || "Admin";
  const initials = (displayName || "A").slice(0, 1).toUpperCase();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await me();
        if (!mounted) return;

        const user = data.user;
        setViewer(user);

        const email = (user?.email || "").toLowerCase();
        const admin = user?.role === "admin" || email === "admin@gmail.com";

        if (!admin) {
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

  async function loadAdminData() {
    setStatsError("");
    setStatsLoading(true);

    try {
      const [examsData, usersData] = await Promise.all([listPublishedExams(), apiGet("/users")]);

      const exams = Array.isArray(examsData?.exams) ? examsData.exams : [];
      const userList = Array.isArray(usersData?.users) ? usersData.users : [];

      setPublishedExams(exams);
      setUsers(userList);
    } catch (err) {
      setPublishedExams([]);
      setUsers([]);
      setStatsError(err?.message || "Failed to load dashboard data");
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && !error && isAdmin) loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, isAdmin]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  const examDraftsCount = useMemo(() => readExamDraftsCount(), []);

  const userSummary = useMemo(() => {
    let total = 0;
    let activeApplicants = 0;
    let disabled = 0;

    for (const u of users || []) {
      total += 1;
      if ((u?.status || "Active") === "Disabled") disabled += 1;

      if (u?.role === "applicant" && (u?.status || "Active") !== "Disabled") {
        activeApplicants += 1;
      }
    }

    return { total, activeApplicants, disabled };
  }, [users]);

  const recentExams = useMemo(() => {
    const list = [...(publishedExams || [])];
    list.sort((a, b) => {
      const at = a?.updatedAt || a?.createdAt || 0;
      const bt = b?.updatedAt || b?.createdAt || 0;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
    return list.slice(0, 4);
  }, [publishedExams]);

  const publishedCount = publishedExams.length;
  const lastClientSeen = useMemo(() => formatDate(Date.now()), []);

  return (
    <div className="canvaShell">
      {/* SIDEBAR */}
      <aside className="canvaSidebar">
        <div className="canvaBrand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
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
            onClick={() => navigate("/modules")}
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
            <div className="canvaPageSubtitle">A focused overview and quick entry points.</div>
          </div>

          <div className="canvaTopbarRight">
            <div className="canvaUserChip" title={viewer?.email || ""}>
              <div className="canvaAvatar">{initials}</div>
              <div className="canvaUserText">
                <div className="canvaUserName">{displayName}</div>
                <div className="canvaUserMeta">{displayRole}</div>
              </div>
            </div>
          </div>
        </div>

        <section className="canvaContent">
          <div className="adminDashWrap compact">
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
                {/* TOP SUMMARY (minimal) */}
                <div className="adminTopCard">
                  <div className="adminTopLeft">
                    <div className="adminTopTitle">Welcome back, {displayName}</div>
                    <div className="adminTopDesc">Jump into core tools or review recent activity.</div>

                    <div className="adminMetaPills">
                      <span className="adminMetaPill">Role: {displayRole}</span>
                      <span className="adminMetaPill">Status: {viewer?.status || "Active"}</span>
                      <span className="adminMetaPill">Last seen: {lastClientSeen}</span>
                    </div>
                  </div>

                  {/* Removed: Manage Users / Exam Builder / Modules / Account settings */}
                  <div className="adminTopRight" />
                </div>

                {statsError ? (
                  <div className="statusBanner error">
                    <div className="statusBannerTitle">Dashboard data failed to load</div>
                    <div className="statusBannerText">{statsError}</div>
                  </div>
                ) : null}

                {/* KPIs (3) */}
                <div className="adminKpiGrid compact3">
                  <div className="adminKpiCard">
                    <div className="adminKpiLabel">Published Exams</div>
                    <div className="adminKpiValue">{publishedCount}</div>
                    <div className="adminKpiHint">In MongoDB</div>
                  </div>

                  <div className="adminKpiCard">
                    <div className="adminKpiLabel">Total Users</div>
                    <div className="adminKpiValue">{userSummary.total}</div>
                    <div className="adminKpiHint">Applicants + admins</div>
                  </div>

                  <div className="adminKpiCard">
                    <div className="adminKpiLabel">Active Applicants</div>
                    <div className="adminKpiValue">{userSummary.activeApplicants}</div>
                    <div className="adminKpiHint">Disabled: {userSummary.disabled}</div>
                  </div>
                </div>

                {/* MAIN (single card only) */}
                <div className="adminMainGrid oneCol">
                  <div className="adminCard">
                    <div className="adminCardHeader">
                      <div>
                        <div className="adminCardTitle">Recent Published Exams</div>
                        <div className="adminCardSub">
                          Latest updates · Drafts on this browser: <b>{examDraftsCount}</b>
                        </div>
                      </div>

                      {/* Removed: Open Builder button */}
                    </div>

                    {statsLoading ? (
                      <div className="adminEmpty">Loading…</div>
                    ) : recentExams.length === 0 ? (
                      <div className="adminEmpty">
                        <div className="adminEmptyTitle">No published exams yet</div>
                        <div className="adminEmptyText">Exam Builder → New Draft → Publish.</div>
                      </div>
                    ) : (
                      <div className="adminList">
                        {recentExams.map((ex) => {
                          const id = ex?._id || ex?.id;
                          const updated = ex?.updatedAt || ex?.createdAt;

                          return (
                            <div className="adminListRow" key={id}>
                              <div className="adminListMain">
                                <div className="adminListTitle">{ex?.examTitle || "Untitled Exam"}</div>
                                <div className="adminListMeta">
                                  <span className="adminPill">Dept: {ex?.department || "—"}</span>
                                  <span className="adminPill">{ex?.durationMinutes || "—"} min</span>
                                  <span className="adminPill">Updated: {updated ? formatDate(updated) : "—"}</span>
                                </div>
                              </div>

                              {/* Removed: Edit button */}
                              <div className="adminListActions" />
                            </div>
                          );
                        })}
                      </div>
                    )}
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
