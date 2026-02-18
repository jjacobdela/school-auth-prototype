import React, { useEffect, useMemo, useRef, useState } from "react";

import { createModule, getModule, updateModule } from "../api/modules";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

function createEmptyPage(type) {
  return {
    id: crypto.randomUUID(),
    title: "",
    type,
    content: {}
  };
}

function reorderByIds(list, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return list;

  const sourceIndex = list.findIndex((p) => p.id === sourceId);
  const targetIndex = list.findIndex((p) => p.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return list;

  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export default function ModuleBuilderAdvanced() {
  const { id } = useParams();
const isEditMode = Boolean(id);
useEffect(() => {
  if (!isEditMode) return;

  async function load() {
    try {
      setError("");
      const res = await getModule(id);
      const m = res.data;

      setModuleTitle(m.title || "");
      setModuleDescription(m.description || "");
      setUiStatus((m.status || "draft").toLowerCase());

      const mapped = (m.pages || []).map((p) => ({
        id: crypto.randomUUID(),
        title: p.title || "",
        type: p.type,
        content: p.content || {}
      }));

      setPages(mapped);
      setActivePageId(mapped[0]?.id || null);
    } catch (err) {
      console.error("LOAD MODULE ERROR:", err);
      setError(err?.response?.data?.message || "Failed to load module");
    }
  }

  load();
}, [id, isEditMode]);

  const navigate = useNavigate();

  const [theme, setTheme] = useState("corporate");

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [newPageType, setNewPageType] = useState("video");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [uiStatus, setUiStatus] = useState("draft"); // "draft" | "published"

  // Drag state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragStartIndexRef = useRef(-1);

  const activePage = pages.find((p) => p.id === activePageId);

  /* ---------------- PAGE ACTIONS ---------------- */

  function addPage() {
    const page = createEmptyPage(newPageType);
    setPages((prev) => [...prev, page]);
    setActivePageId(page.id);
  }

  function removePage(pageId) {
    const next = pages.filter((p) => p.id !== pageId);
    setPages(next);
    if (activePageId === pageId) setActivePageId(next[0]?.id || null);
  }

  function updatePage(pageId, patch) {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, ...patch } : p))
    );
  }

  async function handleFileUpload(pageId, file) {
    // ⚠️ TEMP: replace with real upload later
    const fakeUrl = URL.createObjectURL(file);
    updatePage(pageId, { content: { url: fakeUrl } });
  }

  /* ---------------- VALIDATION (ONLY FOR PUBLISH) ---------------- */

  const isComplete = useMemo(() => {
    if (!moduleTitle.trim()) return false;
    if (pages.length === 0) return false;

    for (const p of pages) {
      if (!p.title.trim()) return false;
      if (p.type === "text" && !p.content?.text?.trim()) return false;
      if (p.type !== "text" && !p.content?.url) return false;
    }
    return true;
  }, [moduleTitle, pages]);

  /* ---------------- DRAG & DROP ---------------- */

  function onDragStart(e, pageId, index) {
    setDraggingId(pageId);
    setDragOverId(null);
    dragStartIndexRef.current = index;

    e.dataTransfer.setData("text/plain", pageId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e, pageId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(pageId);
  }

  function onDrop(e, pageId) {
    e.preventDefault();
    const sourceId = draggingId || e.dataTransfer.getData("text/plain");
    const targetId = pageId;

    setPages((prev) => reorderByIds(prev, sourceId, targetId));

    setDraggingId(null);
    setDragOverId(null);
    dragStartIndexRef.current = -1;
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    dragStartIndexRef.current = -1;
  }

  /* ---------------- SAVE / PUBLISH ---------------- */

  function buildPayload(nextStatus) {
    return {
      title: moduleTitle || "", // drafts can be blank
      description: moduleDescription || "",
      status: nextStatus,
      pages: pages.map(({ id, ...page }) => ({
        ...page,
        content: page.content || {}
      }))
    };
  }

  // ✅ Save Draft: ALWAYS allowed
  async function saveDraft() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload("draft");
      await createModule(payload);
      setUiStatus("draft");
      navigate("/modules");
    } catch (err) {
      console.error("SAVE DRAFT ERROR:", err);
      setError(err?.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Publish: only allowed if complete
  async function publishModule() {
    if (!isComplete || saving) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload("published");
      await createModule(payload);
      setUiStatus("published");
      navigate("/modules");
    } catch (err) {
      console.error("PUBLISH ERROR:", err);
      setError(err?.response?.data?.message || "Failed to publish module");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- UI ---------------- */

  const statusLabel = uiStatus === "published" ? "Published" : "Draft";
  const statusChipClass = uiStatus === "published" ? "ready" : "incomplete";

return (
  <div className="examPage">

    {/* HEADER */}
    <header className="appHeader">
      <div className="appHeaderLeft">
        <div className="brandMark">MB</div>
        <div className="brandText">
          <div className="brandTitle">Module Builder</div>
          <div className="brandSubtitle">Create learning modules</div>
        </div>
      </div>

      <div className="appHeaderRight">
        <button className="navButton" onClick={() => navigate("/modules")}>
          ← Back
        </button>

        <button className="navButton" onClick={saveDraft} disabled={saving}>
          {saving ? "Saving..." : "Save Draft"}
        </button>

        <button
          className="navButton primary"
          disabled={!isComplete || saving}
          onClick={publishModule}
        >
          {saving ? "Saving..." : "Publish"}
        </button>
      </div>
    </header>


    {/* WORKSPACE */}
    <div
      className="examContent"
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 16
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1300,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          alignItems: "stretch"
        }}
      >

        {/* LEFT COLUMN (STACKED) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >

          {/* MODULE DETAILS */}
          <div className="examCard" style={{ flex: 1 }}>
            <div className="section">
              <div className="sectionHeader">
                <div className="sectionTitle">Module Details</div>
                <div className={`statusChip ${uiStatus === "published" ? "ready" : "incomplete"}`}>
                  {uiStatus === "published" ? "Published" : "Draft"}
                </div>
              </div>

              {error && <div className="error">{error}</div>}

              <label className="label">
                Module Title
                <input
                  className="input"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                />
              </label>

              <label className="label">
                Description
                <textarea
                  className="input textarea"
                  rows={4}
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                />
              </label>
            </div>
          </div>


          {/* PAGE EDITOR */}
          <div className="examCard" style={{ flex: 2 }}>
            <div className="section">

              <div className="sectionHeader">
                <div className="sectionTitle">Page Editor</div>
                <div className="sectionHint">
                  {activePage ? "Editing selected page" : "Select a page on the right"}
                </div>
              </div>

              {!activePage ? (
                <div className="emptyState">
                  <div className="emptyTitle">No page selected</div>
                  <div className="emptyText">Click a page to begin editing</div>
                </div>
              ) : (
                <>
                  <label className="label">
                    Page Title
                    <input
                      className="input"
                      value={activePage.title}
                      onChange={(e) =>
                        updatePage(activePage.id, { title: e.target.value })
                      }
                    />
                  </label>

                  {activePage.type === "text" ? (
                    <label className="label">
                      Content
                      <textarea
                        className="input textarea"
                        rows={10}
                        value={activePage.content?.text || ""}
                        onChange={(e) =>
                          updatePage(activePage.id, {
                            content: { text: e.target.value }
                          })
                        }
                      />
                    </label>
                  ) : (
                    <>
                      <label className="label">
                        Upload {activePage.type.toUpperCase()}
                        <input
                          type="file"
                          accept={activePage.type === "video"
                            ? "video/*"
                            : "application/pdf"}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(activePage.id, f);
                          }}
                        />
                      </label>

                      <div className="hintBox">
                        {activePage.content?.url
                          ? "File uploaded ✔"
                          : "No file uploaded yet"}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>


        {/* RIGHT COLUMN (PAGES FULL HEIGHT) */}
        <div className="examCard" style={{ height: "100%" }}>
          <div className="section" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            <div className="sectionHeader">
              <div className="sectionTitle">Pages</div>
            </div>

            <div className="questionToolbar">
              <select
                className="input"
                value={newPageType}
                onChange={(e) => setNewPageType(e.target.value)}
              >
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="text">Text</option>
              </select>

              <button className="navButton primary" onClick={addPage}>
                Add Page
              </button>
            </div>

            {/* SCROLL AREA */}
            <div style={{ flex: 1, overflow: "auto", marginTop: 10 }}>
              <div className="questionList">
                {pages.map((p, index) => (
                  <div
                    key={p.id}
                    className={`questionCard ${activePageId === p.id ? "active" : ""}`}
                    onClick={() => setActivePageId(p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="questionHeader">
                      <div className="questionNumber">
                        Page {index + 1}
                      </div>

                      <button
                        className="dangerButton"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePage(p.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="questionTitle">
                      {p.title || "Untitled Page"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
);









}
