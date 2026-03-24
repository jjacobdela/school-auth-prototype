import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listPublishedExams } from "../api/exams";
import { createModule, getModule, updateModule } from "../api/modules";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";
import "../styles/moduleBuilder.css";

const ITEM_TYPE_META = {
  text: {
    label: "Text",
    helper: "Use for written instructions, learning notes, or lesson copy.",
    placeholder: "Write the lesson content here."
  },
  video: {
    label: "Video",
    helper: "Paste a hosted video link for this lesson resource.",
    placeholder: "https://example.com/video"
  },
  pdf: {
    label: "PDF",
    helper: "Paste a document link for manuals, handouts, or reading material.",
    placeholder: "https://example.com/document.pdf"
  }
};

function buildLessonTitle(index) {
  return `Lesson ${index + 1}`;
}

function buildItemTitle(type, index) {
  const label = ITEM_TYPE_META[type]?.label || "Resource";
  return `${label} ${index + 1}`;
}

function createEmptyItem(type, index) {
  return {
    id: crypto.randomUUID(),
    title: buildItemTitle(type, index),
    type,
    content: type === "text" ? { text: "" } : { url: "" }
  };
}

function createEmptyLesson(index) {
  return {
    id: crypto.randomUUID(),
    title: buildLessonTitle(index),
    summary: "",
    items: [createEmptyItem("text", 0)]
  };
}

function normalizeItem(item = {}, index = 0) {
  const type = ITEM_TYPE_META[item?.type] ? item.type : "text";

  return {
    id: crypto.randomUUID(),
    title: item?.title || buildItemTitle(type, index),
    type,
    content: type === "text" ? { text: item?.content?.text || "" } : { url: item?.content?.url || "" }
  };
}

function normalizeLesson(lesson = {}, index = 0) {
  const items = Array.isArray(lesson?.items) ? lesson.items.map((item, itemIndex) => normalizeItem(item, itemIndex)) : [];

  return {
    id: crypto.randomUUID(),
    title: lesson?.title || buildLessonTitle(index),
    summary: lesson?.summary || "",
    items
  };
}

function getItemIssues(item) {
  const issues = [];

  if (!item?.title?.trim()) {
    issues.push("Add a resource title");
  }

  if (item?.type === "text") {
    if (!item?.content?.text?.trim()) {
      issues.push("Add text content");
    }
  } else if (!item?.content?.url?.trim()) {
    issues.push(`Add a ${ITEM_TYPE_META[item?.type]?.label?.toLowerCase() || "resource"} URL`);
  }

  return issues;
}

function getLessonIssues(lesson) {
  const issues = [];

  if (!lesson?.title?.trim()) {
    issues.push("Add a lesson title");
  }

  if (!Array.isArray(lesson?.items) || lesson.items.length === 0) {
    issues.push("Add at least one learning resource");
  }

  return issues;
}

function moveItem(list, fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex || toIndex >= list.length) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function ModuleBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);

  const routeExamId = searchParams.get("examId") || "";

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [lessons, setLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [newItemType, setNewItemType] = useState("text");
  const [linkedExamId, setLinkedExamId] = useState("");
  const [publishedExams, setPublishedExams] = useState([]);
  const [uiStatus, setUiStatus] = useState("draft");

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPublishedExams() {
    try {
      setExamsLoading(true);
      const data = await listPublishedExams();
      setPublishedExams(Array.isArray(data?.exams) ? data.exams : []);
    } catch (err) {
      console.error("LOAD EXAMS ERROR:", err);
      setPublishedExams([]);
    } finally {
      setExamsLoading(false);
    }
  }

  useEffect(() => {
    loadPublishedExams();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadModule() {
      try {
        setLoading(true);
        setError("");

        const res = await getModule(id);
        const moduleData = res?.data || {};
        if (!mounted) return;

        const normalizedLessons = Array.isArray(moduleData?.lessons)
          ? moduleData.lessons.map((lesson, lessonIndex) => normalizeLesson(lesson, lessonIndex))
          : [];

        setModuleTitle(moduleData?.title || "");
        setModuleDescription(moduleData?.description || "");
        setLessons(normalizedLessons);
        setUiStatus((moduleData?.status || "draft").toLowerCase());
        setLinkedExamId(moduleData?.finalExamId || "");
        setActiveLessonId(normalizedLessons[0]?.id || null);
        setActiveItemId(normalizedLessons[0]?.items?.[0]?.id || null);
      } catch (err) {
        console.error("LOAD MODULE ERROR:", err);
        if (!mounted) return;
        setError(err?.response?.data?.message || "Failed to load module");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadModule();
    return () => {
      mounted = false;
    };
  }, [id, isEditMode]);

  useEffect(() => {
    if (!routeExamId) return;
    setLinkedExamId(routeExamId);
    setNotice("Final exam linked. Save or publish the module to keep the connection.");
  }, [routeExamId]);

  useEffect(() => {
    if (activeLessonId && lessons.some((lesson) => lesson.id === activeLessonId)) {
      return;
    }

    const firstLesson = lessons[0] || null;
    setActiveLessonId(firstLesson?.id || null);
    setActiveItemId(firstLesson?.items?.[0]?.id || null);
  }, [activeLessonId, lessons]);

  const activeLessonIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex] : null;
  const activeItemIndex = activeLesson?.items?.findIndex((item) => item.id === activeItemId) ?? -1;
  const activeItem = activeItemIndex >= 0 ? activeLesson.items[activeItemIndex] : null;

  useEffect(() => {
    if (!activeLesson) {
      setActiveItemId(null);
      return;
    }

    if (activeItemId && activeLesson.items.some((item) => item.id === activeItemId)) {
      return;
    }

    setActiveItemId(activeLesson.items[0]?.id || null);
  }, [activeItemId, activeLesson]);

  const lessonAudits = useMemo(
    () =>
      lessons.map((lesson) => ({
        lessonId: lesson.id,
        lessonIssues: getLessonIssues(lesson),
        itemAudits: lesson.items.map((item) => ({
          itemId: item.id,
          itemIssues: getItemIssues(item)
        }))
      })),
    [lessons]
  );

  const completedLessons = lessonAudits.filter(
    (audit) => audit.lessonIssues.length === 0 && audit.itemAudits.every((itemAudit) => itemAudit.itemIssues.length === 0)
  ).length;

  const publishIssues = useMemo(() => {
    const issues = [];

    if (!moduleTitle.trim()) {
      issues.push("Add a module title");
    }

    if (lessons.length === 0) {
      issues.push("Add at least one lesson");
    }

    lessonAudits.forEach((audit, lessonIndex) => {
      audit.lessonIssues.forEach((issue) => {
        issues.push(`Lesson ${lessonIndex + 1}: ${issue}`);
      });

      audit.itemAudits.forEach((itemAudit, itemIndex) => {
        itemAudit.itemIssues.forEach((issue) => {
          issues.push(`Lesson ${lessonIndex + 1}, resource ${itemIndex + 1}: ${issue}`);
        });
      });
    });

    if (!linkedExamId) {
      issues.push("Link a final exam");
    }

    return issues;
  }, [lessonAudits, lessons.length, linkedExamId, moduleTitle]);

  const isComplete = publishIssues.length === 0;
  const progressPercent = lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100);

  const linkedExam = publishedExams.find((exam) => exam._id === linkedExamId) || null;

  function updateLesson(lessonId, updater) {
    setLessons((prev) =>
      prev.map((lesson) => {
        if (lesson.id !== lessonId) return lesson;

        if (typeof updater === "function") {
          return updater(lesson);
        }

        return { ...lesson, ...updater };
      })
    );
  }

  function updateLessonItem(lessonId, itemId, updater) {
    updateLesson(lessonId, (lesson) => ({
      ...lesson,
      items: lesson.items.map((item) => {
        if (item.id !== itemId) return item;

        if (typeof updater === "function") {
          return updater(item);
        }

        return { ...item, ...updater };
      })
    }));
  }

  function addLesson() {
    const lesson = createEmptyLesson(lessons.length);
    setLessons((prev) => [...prev, lesson]);
    setActiveLessonId(lesson.id);
    setActiveItemId(lesson.items[0]?.id || null);
    setNotice("");
  }

  function removeLesson(lessonId) {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (currentIndex === -1) return;

    const nextLessons = lessons.filter((lesson) => lesson.id !== lessonId);
    const fallbackLesson = nextLessons[currentIndex] || nextLessons[currentIndex - 1] || nextLessons[0] || null;

    setLessons(nextLessons);
    setActiveLessonId(fallbackLesson?.id || null);
    setActiveItemId(fallbackLesson?.items?.[0]?.id || null);
    setNotice("");
  }

  function duplicateLesson(lessonId) {
    const sourceIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (sourceIndex === -1) return;

    const source = lessons[sourceIndex];
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title || buildLessonTitle(sourceIndex)} Copy`,
      items: source.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        content: { ...(item.content || {}) }
      }))
    };

    setLessons((prev) => {
      const next = [...prev];
      next.splice(sourceIndex + 1, 0, copy);
      return next;
    });
    setActiveLessonId(copy.id);
    setActiveItemId(copy.items[0]?.id || null);
    setNotice("");
  }

  function moveLesson(lessonId, direction) {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    setLessons((prev) => moveItem(prev, currentIndex, targetIndex));
    setNotice("");
  }

  function addItemToLesson() {
    if (!activeLesson) return;

    const nextItem = createEmptyItem(newItemType, activeLesson.items.length);
    updateLesson(activeLesson.id, (lesson) => ({
      ...lesson,
      items: [...lesson.items, nextItem]
    }));
    setActiveItemId(nextItem.id);
    setNotice("");
  }

  function duplicateItem(itemId) {
    if (!activeLesson) return;

    const sourceIndex = activeLesson.items.findIndex((item) => item.id === itemId);
    if (sourceIndex === -1) return;

    const source = activeLesson.items[sourceIndex];
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title || buildItemTitle(source.type, sourceIndex)} Copy`,
      content: { ...(source.content || {}) }
    };

    updateLesson(activeLesson.id, (lesson) => {
      const nextItems = [...lesson.items];
      nextItems.splice(sourceIndex + 1, 0, copy);
      return { ...lesson, items: nextItems };
    });
    setActiveItemId(copy.id);
    setNotice("");
  }

  function removeItem(itemId) {
    if (!activeLesson) return;

    const currentIndex = activeLesson.items.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const nextItems = activeLesson.items.filter((item) => item.id !== itemId);
    const fallbackItem = nextItems[currentIndex] || nextItems[currentIndex - 1] || nextItems[0] || null;

    updateLesson(activeLesson.id, (lesson) => ({
      ...lesson,
      items: nextItems
    }));
    setActiveItemId(fallbackItem?.id || null);
    setNotice("");
  }

  function moveLessonItem(itemId, direction) {
    if (!activeLesson) return;

    const currentIndex = activeLesson.items.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    updateLesson(activeLesson.id, (lesson) => ({
      ...lesson,
      items: moveItem(lesson.items, currentIndex, targetIndex)
    }));
    setNotice("");
  }

  function buildPayload(nextStatus) {
    return {
      title: moduleTitle.trim(),
      description: moduleDescription.trim(),
      status: nextStatus,
      finalExamId: linkedExamId || null,
      lessons: lessons.map((lesson) => ({
        title: lesson.title.trim(),
        summary: lesson.summary.trim(),
        items: lesson.items.map((item) => ({
          title: item.title.trim(),
          type: item.type,
          content:
            item.type === "text"
              ? { text: item.content?.text?.trim() || "" }
              : { url: item.content?.url?.trim() || "" }
        }))
      }))
    };
  }

  async function persistModule(nextStatus, { openExamBuilder = false } = {}) {
    if (saving) return;
    if (nextStatus === "published" && !isComplete) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const payload = buildPayload(nextStatus);
      const res = isEditMode ? await updateModule(id, payload) : await createModule(payload);
      const saved = res?.data || {};
      const savedModuleId = saved?._id || id;

      setUiStatus((saved?.status || nextStatus || "draft").toLowerCase());
      setLinkedExamId(saved?.finalExamId || payload.finalExamId || "");

      if (openExamBuilder && savedModuleId) {
        const params = new URLSearchParams();
        params.set("moduleId", savedModuleId);
        params.set("moduleTitle", saved?.title || payload.title || "Untitled module");
        if (saved?.finalExamId || payload.finalExamId) {
          params.set("examId", saved?.finalExamId || payload.finalExamId);
        }
        navigate(`/exam-creation?${params.toString()}`);
        return;
      }

      setNotice(nextStatus === "published" ? "Module published successfully." : "Draft saved successfully.");

      if (!isEditMode && savedModuleId) {
        navigate(`/modules/${savedModuleId}/edit`, { replace: true });
      }
    } catch (err) {
      console.error("MODULE SAVE ERROR:", err);
      setError(err?.response?.data?.message || "Failed to save module");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="moduleBuilderPage">
        <div className="moduleBuilderSkeletonCard">Loading module builder...</div>
      </div>
    );
  }

  return (
    <div className="moduleBuilderPage">
      <section className="moduleBuilderHero">
        <div className="moduleBuilderHeroCopy">
          <div className="moduleBuilderEyebrow">{isEditMode ? "Edit Course Module" : "New Course Module"}</div>
          <h1 className="moduleBuilderTitle">{moduleTitle.trim() || "Untitled module"}</h1>
          <p className="moduleBuilderSubtitle">
            Build a module with lessons, attach learning resources under each lesson, and link a final assessment before publishing.
          </p>
        </div>

        <div className="moduleBuilderHeroMeta">
          <div className={`statusChip ${uiStatus === "published" ? "ready" : "incomplete"}`}>{uiStatus === "published" ? "Published" : "Draft"}</div>
          <div className="moduleBuilderMetaGrid">
            <div className="moduleBuilderMetaCard">
              <div className="moduleBuilderMetaLabel">Lessons</div>
              <div className="moduleBuilderMetaValue">{lessons.length}</div>
            </div>

            <div className="moduleBuilderMetaCard">
              <div className="moduleBuilderMetaLabel">Resources</div>
              <div className="moduleBuilderMetaValue">
                {lessons.reduce((sum, lesson) => sum + lesson.items.length, 0)}
              </div>
            </div>

            <div className="moduleBuilderMetaCard">
              <div className="moduleBuilderMetaLabel">Progress</div>
              <div className="moduleBuilderMetaValue">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}
      {notice ? <div className="moduleBuilderNotice">{notice}</div> : null}

      <div className="moduleBuilderLayout">
        <div className="moduleBuilderMain">
          <section className="examCard moduleBuilderCard">
            <div className="sectionHeader">
              <div className="sectionTitle">1. Module overview</div>
              <div className="sectionHint">Name the module or course and explain what teachers or learners should expect.</div>
            </div>

            <div className="moduleBuilderFieldGrid">
              <label className="label">
                Module or Course Title
                <input
                  className="input"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Example: Safety Orientation"
                />
              </label>

              <label className="label moduleBuilderWideField">
                Description
                <textarea
                  className="input textarea"
                  rows={4}
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  placeholder="Summarize what this module covers, who it is for, and how the learning is structured."
                />
              </label>
            </div>
          </section>

          <section className="examCard moduleBuilderCard">
            <div className="sectionHeader">
              <div className="sectionTitle">2. Lesson outline</div>
              <div className="sectionHint">Each lesson can hold multiple learning resources such as text, PDFs, and videos.</div>
            </div>

            <div className="moduleBuilderLessonToolbar">
              <button className="navButton primary" type="button" onClick={addLesson}>
                Add Lesson
              </button>
            </div>

            {lessons.length === 0 ? (
              <div className="emptyState">
                <div className="emptyTitle">No lessons yet</div>
                <div className="emptyText">Start by adding Lesson 1, then attach learning resources inside it.</div>
              </div>
            ) : (
              <div className="moduleBuilderOutline">
                {lessons.map((lesson, lessonIndex) => {
                  const audit = lessonAudits[lessonIndex];
                  const issueCount =
                    (audit?.lessonIssues.length || 0) +
                    (audit?.itemAudits || []).reduce((sum, itemAudit) => sum + itemAudit.itemIssues.length, 0);

                  return (
                    <div className={`moduleBuilderOutlineRow ${lesson.id === activeLessonId ? "active" : ""}`} key={lesson.id}>
                      <button className="moduleBuilderOutlineSelect" type="button" onClick={() => setActiveLessonId(lesson.id)}>
                        <div className="moduleBuilderOutlineTop">
                          <span className="moduleBuilderOutlineIndex">Lesson {lessonIndex + 1}</span>
                          <span className={`moduleBuilderOutlineState ${issueCount === 0 ? "ready" : "pending"}`}>
                            {issueCount === 0 ? "Ready" : `${issueCount} issue${issueCount === 1 ? "" : "s"}`}
                          </span>
                        </div>

                        <div className="moduleBuilderOutlineTitle">{lesson.title || buildLessonTitle(lessonIndex)}</div>
                        <div className="moduleBuilderOutlineMeta">
                          {lesson.items.length} resource{lesson.items.length === 1 ? "" : "s"}
                        </div>
                      </button>

                      <div className="moduleBuilderOutlineActions">
                        <button className="moduleBuilderGhostButton" type="button" onClick={() => moveLesson(lesson.id, "up")} disabled={lessonIndex === 0}>
                          Up
                        </button>
                        <button
                          className="moduleBuilderGhostButton"
                          type="button"
                          onClick={() => moveLesson(lesson.id, "down")}
                          disabled={lessonIndex === lessons.length - 1}
                        >
                          Down
                        </button>
                        <button className="moduleBuilderGhostButton" type="button" onClick={() => duplicateLesson(lesson.id)}>
                          Duplicate
                        </button>
                        <button className="dangerButton dangerButtonSmall" type="button" onClick={() => removeLesson(lesson.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="examCard moduleBuilderCard">
            <div className="sectionHeader">
              <div className="sectionTitle">3. Lesson editor</div>
              <div className="sectionHint">
                {activeLesson ? "Edit lesson details and add multiple learning resources below." : "Select a lesson from the outline to continue."}
              </div>
            </div>

            {!activeLesson ? (
              <div className="emptyState">
                <div className="emptyTitle">Select a lesson</div>
                <div className="emptyText">When a lesson is selected, you can define its title, summary, and learning resources.</div>
              </div>
            ) : (
              <div className="moduleBuilderEditor">
                <div className="moduleBuilderEditorSection">
                  <label className="label">
                    Lesson Title
                    <input
                      className="input"
                      value={activeLesson.title}
                      onChange={(e) => updateLesson(activeLesson.id, { title: e.target.value })}
                      placeholder={buildLessonTitle(activeLessonIndex)}
                    />
                  </label>

                  <label className="label">
                    Lesson Summary
                    <textarea
                      className="input textarea"
                      rows={3}
                      value={activeLesson.summary}
                      onChange={(e) => updateLesson(activeLesson.id, { summary: e.target.value })}
                      placeholder="Optional summary for this lesson."
                    />
                  </label>
                </div>

                <div className="moduleBuilderResourceToolbar">
                  <div className="moduleBuilderResourcePicker">
                    {Object.entries(ITEM_TYPE_META).map(([value, meta]) => (
                      <button
                        key={value}
                        className={`moduleBuilderTypeButton ${newItemType === value ? "active" : ""}`}
                        type="button"
                        onClick={() => setNewItemType(value)}
                      >
                        <span className="moduleBuilderTypeLabel">{meta.label}</span>
                        <span className="moduleBuilderTypeHint">{meta.helper}</span>
                      </button>
                    ))}
                  </div>

                  <button className="navButton primary" type="button" onClick={addItemToLesson}>
                    Add {ITEM_TYPE_META[newItemType].label}
                  </button>
                </div>

                <div className="moduleBuilderResourceList">
                  {activeLesson.items.length === 0 ? (
                    <div className="emptyState">
                      <div className="emptyTitle">No learning resources yet</div>
                      <div className="emptyText">Add text, PDF, or video resources to complete this lesson.</div>
                    </div>
                  ) : (
                    activeLesson.items.map((item, itemIndex) => {
                      const issues = getItemIssues(item);

                      return (
                        <div className={`moduleBuilderResourceRow ${item.id === activeItemId ? "active" : ""}`} key={item.id}>
                          <button className="moduleBuilderResourceSelect" type="button" onClick={() => setActiveItemId(item.id)}>
                            <div className="moduleBuilderOutlineTop">
                              <span className="moduleBuilderOutlineIndex">Resource {itemIndex + 1}</span>
                              <span className={`moduleBuilderOutlineState ${issues.length === 0 ? "ready" : "pending"}`}>
                                {issues.length === 0 ? "Ready" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}
                              </span>
                            </div>

                            <div className="moduleBuilderOutlineTitle">{item.title || buildItemTitle(item.type, itemIndex)}</div>
                            <div className="moduleBuilderOutlineMeta">{ITEM_TYPE_META[item.type].label}</div>
                          </button>

                          <div className="moduleBuilderOutlineActions">
                            <button className="moduleBuilderGhostButton" type="button" onClick={() => moveLessonItem(item.id, "up")} disabled={itemIndex === 0}>
                              Up
                            </button>
                            <button
                              className="moduleBuilderGhostButton"
                              type="button"
                              onClick={() => moveLessonItem(item.id, "down")}
                              disabled={itemIndex === activeLesson.items.length - 1}
                            >
                              Down
                            </button>
                            <button className="moduleBuilderGhostButton" type="button" onClick={() => duplicateItem(item.id)}>
                              Duplicate
                            </button>
                            <button className="dangerButton dangerButtonSmall" type="button" onClick={() => removeItem(item.id)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {activeItem ? (
                  <div className="moduleBuilderItemEditor">
                    <div className="moduleBuilderEditorHeader">
                      <div>
                        <div className="moduleBuilderEditorTitle">{ITEM_TYPE_META[activeItem.type].label} Resource</div>
                        <div className="moduleBuilderEditorHint">{ITEM_TYPE_META[activeItem.type].helper}</div>
                      </div>

                      <div className={`moduleBuilderEditorState ${getItemIssues(activeItem).length === 0 ? "ready" : "pending"}`}>
                        {getItemIssues(activeItem).length === 0 ? "Ready to publish" : "Needs attention"}
                      </div>
                    </div>

                    <label className="label">
                      Resource Title
                      <input
                        className="input"
                        value={activeItem.title}
                        onChange={(e) => updateLessonItem(activeLesson.id, activeItem.id, { title: e.target.value })}
                        placeholder={buildItemTitle(activeItem.type, activeItemIndex)}
                      />
                    </label>

                    {activeItem.type === "text" ? (
                      <label className="label">
                        Text Content
                        <textarea
                          className="input textarea"
                          rows={10}
                          value={activeItem.content?.text || ""}
                          onChange={(e) =>
                            updateLessonItem(activeLesson.id, activeItem.id, (item) => ({
                              ...item,
                              content: { text: e.target.value }
                            }))
                          }
                          placeholder={ITEM_TYPE_META.text.placeholder}
                        />
                      </label>
                    ) : (
                      <label className="label">
                        Resource URL
                        <input
                          className="input"
                          value={activeItem.content?.url || ""}
                          onChange={(e) =>
                            updateLessonItem(activeLesson.id, activeItem.id, (item) => ({
                              ...item,
                              content: { url: e.target.value }
                            }))
                          }
                          placeholder={ITEM_TYPE_META[activeItem.type].placeholder}
                        />
                      </label>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside className="moduleBuilderSidebar">
          <section className="moduleBuilderSidebarCard">
            <div className="moduleBuilderSidebarTitle">4. Final assessment</div>

            <label className="label">
              Linked Final Exam
              <select
                className="input"
                value={linkedExamId}
                onChange={(e) => {
                  setLinkedExamId(e.target.value);
                  setNotice("");
                }}
                disabled={examsLoading}
              >
                <option value="">{examsLoading ? "Loading exams..." : "Select a published exam"}</option>
                {publishedExams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.examTitle} • {exam.department}
                  </option>
                ))}
              </select>
            </label>

            <div className="moduleBuilderSidebarNote">
              The linked exam appears at the end of this module. A module cannot be published until a final exam is linked.
            </div>

            <div className="moduleBuilderActionStack">
              <button className="navButton" type="button" onClick={() => persistModule("draft", { openExamBuilder: true })} disabled={saving}>
                {linkedExam ? "Open Linked Exam Builder" : "Create Final Exam"}
              </button>

              {linkedExam ? (
                <div className="moduleBuilderLinkedExamCard">
                  <div className="moduleBuilderLinkedExamLabel">Currently linked</div>
                  <div className="moduleBuilderLinkedExamTitle">{linkedExam.examTitle}</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="moduleBuilderSidebarCard">
            <div className="moduleBuilderSidebarTitle">Publish checklist</div>
            <div className="moduleBuilderProgressBar">
              <div className="moduleBuilderProgressFill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="moduleBuilderProgressMeta">
              {completedLessons} of {lessons.length || 0} lesson{lessons.length === 1 ? "" : "s"} fully ready
            </div>

            {publishIssues.length === 0 ? (
              <div className="moduleBuilderChecklistReady">Everything required for publishing is complete.</div>
            ) : (
              <ul className="moduleBuilderIssueList">
                {publishIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="moduleBuilderSidebarCard">
            <div className="moduleBuilderSidebarTitle">Actions</div>
            <div className="moduleBuilderActionStack">
              <button className="navButton" type="button" onClick={() => navigate("/modules")}>
                Back to Modules
              </button>
              <button className="navButton" type="button" onClick={() => persistModule("draft")} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button className="navButton primary" type="button" onClick={() => persistModule("published")} disabled={!isComplete || saving}>
                {saving ? "Saving..." : "Publish Module"}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
