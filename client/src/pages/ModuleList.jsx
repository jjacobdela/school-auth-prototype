import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";
import { getModules, deleteModule } from "../api/modules";
import { useParams } from "react-router-dom";
import { getModule, updateModule } from "../api/modules";


/*
  MODULE MODEL
  {
    _id,
    title,
    description,
    pagesCount,
    createdAt
  }
*/

export default function ModulesList() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
const isEditMode = Boolean(id);


  const [deletingId, setDeletingId] = useState(null); // ✅ which module is being deleted
  const [error, setError] = useState("");

  useEffect(() => {
  if (!isEditMode) return;

  async function loadModule() {
    try {
      const res = await getModule(id);
      const m = res.data;

      setModuleTitle(m.title || "");
      setModuleDescription(m.description || "");
      setUiStatus(m.status || "draft");

      const mappedPages = (m.pages || []).map((p) => ({
  id: crypto.randomUUID(),
  title: p?.title || "",
  type: p?.type || "text",          // ✅ default to text
  content: p?.content || {}         // ✅ always object
}));


      setPages(mappedPages);
      setActivePageId(mappedPages[0]?.id || null);

    } catch (err) {
      console.error("LOAD MODULE ERROR:", err);
    }
  }

  loadModule();
}, [id]);


  useEffect(() => {
    fetchModules();
  }, []);

  async function fetchModules() {
    try {
      setError("");
      const res = await getModules();
      setModules(res.data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
  if (saving) return;

  setSaving(true);
  setError("");

  try {
    const payload = buildPayload("draft");

    if (isEditMode) {
      await updateModule(id, payload);
    } else {
      await createModule(payload);
    }

    navigate("/modules");

  } catch (err) {
    setError(err?.response?.data?.message || "Failed to save draft");
  } finally {
    setSaving(false);
  }
}

  async function handleDelete(moduleId) {
    const ok = window.confirm("Delete this module? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingId(moduleId);
      setError("");

      await deleteModule(moduleId);

      // ✅ remove from UI instantly
      setModules((prev) => prev.filter((m) => m._id !== moduleId));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete module");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredModules = modules.filter((m) =>
    (m.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="examPage">
      {/* HEADER */}
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark">MB</div>
          <div className="brandText">
            <div className="brandTitle">Modules</div>
            <div className="brandSubtitle">View all learning modules</div>
          </div>
        </div>

        <div className="appHeaderRight">
          <button className="navButton" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>

          <button className="navButton primary" onClick={() => navigate("/modules/new")}>
            + New Module
          </button>
        </div>
      </header>

      <div className="examContent">
        <div className="examCard">
          {/* SEARCH */}
          <div className="section">
            <input
              className="input"
              placeholder="Search modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* LIST */}
          <div className="section">
            {loading && <div className="hintBox">Loading modules...</div>}
            {!loading && error && <div className="error">{error}</div>}

            {!loading && !error && filteredModules.length === 0 && (
              <div className="emptyState">
                <div className="emptyTitle">No modules found</div>
                <div className="emptyText">Create your first module to get started.</div>
              </div>
            )}

            <div className="questionList">
              {filteredModules.map((m) => {
  const status = (m.status || "draft").toLowerCase();
  const isPublished = status === "published";

  async function publishModule() {
  if (!isComplete || saving) return;

  setSaving(true);
  setError("");

  try {
    const payload = buildPayload("published");

    if (isEditMode) {
      await updateModule(id, payload);
    } else {
      await createModule(payload);
    }

    navigate("/modules");

  } catch (err) {
    setError(err?.response?.data?.message || "Failed to publish module");
  } finally {
    setSaving(false);
  }
}


  return (
    <div key={m._id} className="questionCard">
      <div className="questionHeader">
        <div className="questionHeaderLeft">
          <div
            className="questionTitle"
            style={{ fontWeight: "700", fontSize: "1.05rem" }}
          >
            {m.title}
          </div>
        </div>

        <div className="questionHeaderRight">
          {/* ✅ STATUS CHIP */}
          <span className={`statusChip ${isPublished ? "ready" : "incomplete"}`}>
            {isPublished ? "Published" : "Draft"}
          </span>

          {/* 👀 VIEW */}
          <button className="navButton" onClick={() => navigate(`/modules/${m._id}/view`)}>
            View
          </button>

          {/* ✏️ EDIT */}
          <button className="navButton" onClick={() => navigate(`/modules/${m._id}/edit`)}>
            Edit
          </button>

          {/* 🗑 DELETE */}
          <button
            className="dangerButton"
            onClick={() => handleDelete(m._id)}
            disabled={deletingId === m._id}
            title={deletingId === m._id ? "Deleting..." : "Delete"}
          >
            {deletingId === m._id ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="questionBody">
        <div className="questionMeta">
          <span>{m.description}</span>
        </div>

        <div className="questionMeta">
          <span>{m.pagesCount} pages</span>
          <span> • </span>
          <span>
            Created {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
          </span>
        </div>
      </div>
    </div>
  );
})}

            </div>

            {!loading && (
              <div style={{ marginTop: 12 }}>
                <button className="navButton" onClick={fetchModules}>
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
