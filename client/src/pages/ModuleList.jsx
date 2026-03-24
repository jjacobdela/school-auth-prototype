import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteModule, getModules } from "../api/modules";
import { useViewerContext } from "../components/viewerContext";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";
import "../styles/moduleList.css";

function formatDate(ts) {
  if (!ts) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(ts));
  } catch {
    return "—";
  }
}

function describeModule(module) {
  const description = (module?.description || "").trim();
  if (description) return description;
  return "No description added yet.";
}

function normalizeStatus(status) {
  return (status || "draft").toLowerCase() === "published" ? "published" : "draft";
}

function getLessonsCount(module) {
  return Number(module?.lessonsCount || 0);
}

function getResourcesCount(module) {
  return Number(module?.resourcesCount || module?.pagesCount || 0);
}

function hasLinkedFinalExam(module) {
  return Boolean(module?.finalExam?._id || module?.finalExamId);
}

export default function ModulesList() {
  const navigate = useNavigate();
  const { viewer } = useViewerContext() || {};

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState("newest");

  const email = (viewer?.email || "").toLowerCase();
  const isAdmin = viewer?.role === "admin" || email === "admin@gmail.com";

  async function fetchModules({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError("");
      const res = await getModules();
      setModules(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setModules([]);
      setError(err?.response?.data?.message || "Failed to load modules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchModules();
  }, []);

  async function handleDelete(moduleId, title) {
    const ok = window.confirm(`Delete "${title || "this module"}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setDeletingId(moduleId);
      setError("");
      await deleteModule(moduleId);
      setModules((prev) => prev.filter((module) => module._id !== moduleId));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete module");
    } finally {
      setDeletingId(null);
    }
  }

  const visibleModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = [...modules];

    if (!isAdmin) {
      list = list.filter((module) => normalizeStatus(module.status) === "published");
    }

    if (query) {
      list = list.filter((module) => {
        const title = (module?.title || "").toLowerCase();
        const description = (module?.description || "").toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }

    if (isAdmin && statusFilter !== "All") {
      list = list.filter((module) => normalizeStatus(module.status) === statusFilter.toLowerCase());
    }

    list.sort((a, b) => {
      if (sort === "title") {
        return (a?.title || "").localeCompare(b?.title || "");
      }

      if (sort === "resources_desc") {
        return getResourcesCount(b) - getResourcesCount(a);
      }

      if (sort === "oldest") {
        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      }

      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });

    return list;
  }, [isAdmin, modules, search, sort, statusFilter]);

  const stats = useMemo(() => {
    const published = modules.filter((module) => normalizeStatus(module.status) === "published").length;
    const drafts = modules.filter((module) => normalizeStatus(module.status) === "draft").length;
    const totalLessons = modules.reduce((sum, module) => sum + getLessonsCount(module), 0);
    const totalResources = modules.reduce((sum, module) => sum + getResourcesCount(module), 0);
    const linkedExams = modules.filter((module) => hasLinkedFinalExam(module)).length;
    const newestCreatedAt = [...modules]
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())[0]?.createdAt;

    if (isAdmin) {
      return [
        { label: "Total Modules", value: modules.length, hint: `${published} published, ${drafts} draft` },
        { label: "Learning Content", value: totalLessons, hint: `${totalResources} resources across all modules` },
        { label: "Final Exams Linked", value: linkedExams, hint: linkedExams ? "Modules with an end-of-course assessment" : "No final exams linked yet" }
      ];
    }

    const visibleLessons = visibleModules.reduce((sum, module) => sum + getLessonsCount(module), 0);
    const visibleResources = visibleModules.reduce((sum, module) => sum + getResourcesCount(module), 0);
    const visibleLinkedExams = visibleModules.filter((module) => hasLinkedFinalExam(module)).length;

    return [
      { label: "Available Modules", value: visibleModules.length, hint: "Published and ready to review" },
      { label: "Lesson Library", value: visibleLessons, hint: `${visibleResources} resources across visible modules` },
      { label: "Final Assessments", value: visibleLinkedExams, hint: newestCreatedAt ? `Latest update ${formatDate(newestCreatedAt)}` : "No recent updates yet" }
    ];
  }, [isAdmin, modules, visibleModules]);

  const pageTitle = isAdmin ? "Module Library" : "Training Catalog";
  const pageSubtitle = isAdmin
    ? "Manage draft and published learning modules from one place."
    : "Browse published training modules available in the system.";

  return (
    <div className="moduleIndex">
      <section className="moduleHeroCard">
        <div className="moduleHeroCopy">
          <div className="moduleEyebrow">{isAdmin ? "Operations" : "Learning"}</div>
          <h1 className="moduleHeroTitle">{pageTitle}</h1>
          <p className="moduleHeroText">{pageSubtitle}</p>
        </div>

        <div className="moduleHeroActions">
          <button className="navButton" type="button" onClick={() => fetchModules({ silent: true })} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {isAdmin ? (
            <button className="navButton primary" type="button" onClick={() => navigate("/modules/new")}>
              New Module
            </button>
          ) : (
            <button className="navButton primary" type="button" onClick={() => navigate("/request-training")}>
              Request Training
            </button>
          )}
        </div>
      </section>

      <section className="moduleStatsGrid">
        {stats.map((stat) => (
          <div className="moduleStatCard" key={stat.label}>
            <div className="moduleStatLabel">{stat.label}</div>
            <div className="moduleStatValue">{stat.value}</div>
            <div className="moduleStatHint">{stat.hint}</div>
          </div>
        ))}
      </section>

      <section className="moduleControlsCard">
        <div className="moduleControlsGrid">
          <label className="label moduleField">
            Search
            <input
              className="input"
              placeholder="Search by module title or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {isAdmin ? (
            <label className="label moduleField moduleFieldCompact">
              Status
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </label>
          ) : null}

          <label className="label moduleField moduleFieldCompact">
            Sort
              <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A-Z</option>
                <option value="resources_desc">Most content</option>
              </select>
            </label>
          </div>
      </section>

      <section className="moduleListCard">
        <div className="moduleListHeader">
          <div>
            <div className="moduleListTitle">Modules</div>
            <div className="moduleListSubtitle">
              {visibleModules.length} result{visibleModules.length === 1 ? "" : "s"}
              {!isAdmin ? " visible to applicants" : ""}
            </div>
          </div>

          {isAdmin ? <div className="moduleListHint">Draft modules stay internal until published.</div> : null}
        </div>

        {loading ? <div className="hintBox">Loading modules...</div> : null}
        {!loading && error ? <div className="error">{error}</div> : null}

        {!loading && !error && visibleModules.length === 0 ? (
          <div className="emptyState">
            <div className="emptyTitle">{isAdmin ? "No modules found" : "No published modules available"}</div>
            <div className="emptyText">
              {isAdmin
                ? "Create a module or change your filters to see more results."
                : "Published modules will appear here once they are available."}
            </div>
          </div>
        ) : null}

        {!loading && !error && visibleModules.length > 0 ? (
          <div className="moduleTable">
            <div className="moduleTableHead">
              <div>Module</div>
              <div>Status</div>
              <div>Structure</div>
              <div>Created</div>
              <div>Actions</div>
            </div>

            <div className="moduleTableBody">
              {visibleModules.map((module) => {
                const status = normalizeStatus(module.status);
                const title = module?.title || "Untitled module";

                return (
                  <article className="moduleRow" key={module._id}>
                    <div className="modulePrimaryCell">
                      <div className="moduleTitleRow">
                        <div className="moduleTitle">{title}</div>
                        {status === "draft" ? <span className="moduleInlineTag">Internal</span> : null}
                        <span className={`moduleExamTag ${hasLinkedFinalExam(module) ? "ready" : "pending"}`}>
                          {hasLinkedFinalExam(module) ? "Final exam linked" : "No final exam"}
                        </span>
                      </div>
                      <div className="moduleDescription">{describeModule(module)}</div>
                    </div>

                    <div className="moduleCell">
                      <span className={`moduleStatusBadge ${status}`}>{status === "published" ? "Published" : "Draft"}</span>
                    </div>

                    <div className="moduleCell moduleCellStack">
                      <div className="moduleCellStrong">{getLessonsCount(module)} lessons</div>
                      <div className="moduleCellMuted">{getResourcesCount(module)} resources</div>
                    </div>

                    <div className="moduleCell moduleCellMuted">{formatDate(module?.createdAt)}</div>

                    <div className="moduleActions">
                      <button className="navButton" type="button" onClick={() => navigate(`/modules/${module._id}/view`)}>
                        View
                      </button>

                      {isAdmin ? (
                        <button className="navButton" type="button" onClick={() => navigate(`/modules/${module._id}/edit`)}>
                          Edit
                        </button>
                      ) : null}

                      {isAdmin ? (
                        <button
                          className="dangerButton"
                          type="button"
                          onClick={() => handleDelete(module._id, title)}
                          disabled={deletingId === module._id}
                        >
                          {deletingId === module._id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
