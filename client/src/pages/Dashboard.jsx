import React, { useEffect, useMemo, useState } from "react";
import { getToken } from "../api/auth";
import { listPublishedExams } from "../api/exams";
import { useViewerContext } from "../components/viewerContext";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";
import "../styles/adminDashboard.css";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api`;
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
  const { viewer, loading: viewerLoading } = useViewerContext() || {};

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const [publishedExams, setPublishedExams] = useState([]);
  const [users, setUsers] = useState([]);

  const isAdmin = useMemo(() => {
    const email = (viewer?.email || "").toLowerCase();
    return viewer?.role === "admin" || email === "admin@gmail.com";
  }, [viewer]);

  const displayRole = isAdmin ? "admin" : viewer?.role || "applicant";
  const displayName = viewer?.fullName || viewer?.email || "Admin";

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
    if (!viewerLoading && isAdmin) loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerLoading, isAdmin]);

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
    <section className="canvaContent">
      <div className="adminDashWrap compact">
        {viewerLoading && <div className="canvaState">Loading...</div>}

        {!viewerLoading && (
          <>
            <div className="adminTopCard">
              <div className="adminTopLeft">
                <div className="adminTopTitle">Welcome back, {displayName}</div>
                <div className="adminTopDesc">Review operational activity and move into the tools you use most.</div>

                <div className="adminMetaPills">
                  <span className="adminMetaPill">Role: {displayRole}</span>
                  <span className="adminMetaPill">Status: {viewer?.status || "Active"}</span>
                  <span className="adminMetaPill">Last seen: {lastClientSeen}</span>
                </div>
              </div>

              <div className="adminTopRight" />
            </div>

            {statsError ? (
              <div className="statusBanner error">
                <div className="statusBannerTitle">Dashboard data failed to load</div>
                <div className="statusBannerText">{statsError}</div>
              </div>
            ) : null}

            <div className="adminKpiGrid compact3">
              <div className="adminKpiCard">
                <div className="adminKpiLabel">Published Exams</div>
                <div className="adminKpiValue">{publishedCount}</div>
                <div className="adminKpiHint">Live records in the system</div>
              </div>

              <div className="adminKpiCard">
                <div className="adminKpiLabel">Total Users</div>
                <div className="adminKpiValue">{userSummary.total}</div>
                <div className="adminKpiHint">Applicants and admins combined</div>
              </div>

              <div className="adminKpiCard">
                <div className="adminKpiLabel">Active Applicants</div>
                <div className="adminKpiValue">{userSummary.activeApplicants}</div>
                <div className="adminKpiHint">Disabled accounts: {userSummary.disabled}</div>
              </div>
            </div>

            <div className="adminMainGrid oneCol">
              <div className="adminCard">
                <div className="adminCardHeader">
                  <div>
                    <div className="adminCardTitle">Recent Published Exams</div>
                    <div className="adminCardSub">
                      Latest updates. Drafts saved in this browser: <b>{examDraftsCount}</b>
                    </div>
                  </div>
                </div>

                {statsLoading ? (
                  <div className="adminEmpty">Loading…</div>
                ) : recentExams.length === 0 ? (
                  <div className="adminEmpty">
                    <div className="adminEmptyTitle">No published exams yet</div>
                    <div className="adminEmptyText">Use the exam builder to create a draft and publish it.</div>
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
  );
}
