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
    helper: "Use written lesson content, instructions, or notes.",
    placeholder: "Write the lesson content here."
  },
  video: {
    label: "Video",
    helper: "Paste a hosted video link for this lesson resource.",
    placeholder: "https://example.com/video"
  },
  pdf: {
    label: "PDF",
    helper: "Paste a PDF or document link for this lesson resource.",
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

function countResources(lessons) {
  return (lessons || []).reduce((sum, lesson) => sum + (lesson?.items?.length || 0), 0);
}

function normalizeContentByType(type, content = {}) {
  return type === "text" ? { text: content?.text || "" } : { url: content?.url || "" };
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
  const [linkedExamId, setLinkedExamId] = useState("");
  const [publishedExams, setPublishedExams] = useState([]);
  const [uiStatus, setUiStatus] = useState("draft");

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  function showNotice(message) {
    setNotice({
      id: crypto.randomUUID(),
      message
    });
  }

  function clearNotice() {
    setNotice(null);
  }

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
    showNotice("Final exam linked. Save or publish the module to keep the connection.");
  }, [routeExamId]);

  useEffect(() => {
    if (!notice?.id) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

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

  const resourceCount = useMemo(() => countResources(lessons), [lessons]);
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

  function updateItemType(lessonId, itemId, nextType) {
    updateLessonItem(lessonId, itemId, (item) => ({
      ...item,
      type: nextType,
      content: normalizeContentByType(nextType)
    }));
  }

  function addLesson() {
    const lesson = createEmptyLesson(lessons.length);
    setLessons((prev) => [...prev, lesson]);
    showNotice(`${lesson.title} added to the module.`);
  }

  function removeLesson(lessonId) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    setLessons((prev) => prev.filter((entry) => entry.id !== lessonId));
    showNotice(`${lesson?.title || "Lesson"} removed from the module.`);
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
    showNotice(`${copy.title} duplicated.`);
  }

  function moveLesson(lessonId, direction) {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    setLessons((prev) => moveItem(prev, currentIndex, targetIndex));
    clearNotice();
  }

  function addItemToLesson(lessonId, type) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;

    updateLesson(lessonId, (currentLesson) => ({
      ...currentLesson,
      items: [...currentLesson.items, createEmptyItem(type, currentLesson.items.length)]
    }));
    showNotice(`${ITEM_TYPE_META[type].label} resource added to ${lesson.title || "the lesson"}.`);
  }

  function duplicateItem(lessonId, itemId) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;

    const sourceIndex = lesson.items.findIndex((item) => item.id === itemId);
    if (sourceIndex === -1) return;

    const source = lesson.items[sourceIndex];
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title || buildItemTitle(source.type, sourceIndex)} Copy`,
      content: { ...(source.content || {}) }
    };

    updateLesson(lessonId, (entry) => {
      const nextItems = [...entry.items];
      nextItems.splice(sourceIndex + 1, 0, copy);
      return { ...entry, items: nextItems };
    });
    showNotice(`${copy.title} duplicated in ${lesson.title || "the lesson"}.`);
  }

  function removeItem(lessonId, itemId) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    const item = lesson?.items?.find((entry) => entry.id === itemId);
    updateLesson(lessonId, (lesson) => ({
      ...lesson,
      items: lesson.items.filter((item) => item.id !== itemId)
    }));
    showNotice(`${item?.title || "Resource"} removed from ${lesson?.title || "the lesson"}.`);
  }

  function moveLessonItem(lessonId, itemId, direction) {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;

    const currentIndex = lesson.items.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    updateLesson(lessonId, (entry) => ({
      ...entry,
      items: moveItem(entry.items, currentIndex, targetIndex)
    }));
    clearNotice();
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
      clearNotice();

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

      showNotice(nextStatus === "published" ? "Module published successfully." : "Draft saved successfully.");

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
            Create the module as one form: add lessons, attach learning resources inside each lesson, then connect the final exam before publishing.
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
              <div className="moduleBuilderMetaValue">{resourceCount}</div>
            </div>

            <div className="moduleBuilderMetaCard">
              <div className="moduleBuilderMetaLabel">Progress</div>
              <div className="moduleBuilderMetaValue">{progressPercent}%</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}
      {notice ? (
        <div className="moduleBuilderToast" role="status" aria-live="polite">
          {notice.message}
        </div>
      ) : null}

      <div className="moduleBuilderForm">
        <section className="moduleBuilderCard">
          <div className="moduleBuilderCardHeader">
            <div>
              <div className="moduleBuilderCardTitle">Module details</div>
              <div className="moduleBuilderCardHint">Start with the course title and a short description.</div>
            </div>
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

        <section className="moduleBuilderCard">
          <div className="moduleBuilderCardHeader">
            <div>
              <div className="moduleBuilderCardTitle">Lessons and learning content</div>
              <div className="moduleBuilderCardHint">Each lesson stays inline so the whole course can be authored like a single form.</div>
            </div>

            <div className="moduleBuilderSectionActions">
              <button className="navButton primary" type="button" onClick={addLesson}>
                Add Lesson
              </button>
            </div>
          </div>

          {lessons.length === 0 ? (
            <div className="emptyState">
              <div className="emptyTitle">No lessons yet</div>
              <div className="emptyText">Add Lesson 1 to start building the module content.</div>
            </div>
          ) : (
            <div className="moduleBuilderLessons">
              {lessons.map((lesson, lessonIndex) => {
                const audit = lessonAudits[lessonIndex];
                const lessonIssueCount =
                  (audit?.lessonIssues.length || 0) +
                  (audit?.itemAudits || []).reduce((sum, itemAudit) => sum + itemAudit.itemIssues.length, 0);

                return (
                  <article className="moduleBuilderLessonCard" key={lesson.id}>
                    <div className="moduleBuilderLessonHeader">
                      <div className="moduleBuilderLessonMeta">
                        <div className="moduleBuilderLessonIndex">Lesson {lessonIndex + 1}</div>
                        <div className="moduleBuilderLessonName">{lesson.title || buildLessonTitle(lessonIndex)}</div>
                        <div className="moduleBuilderLessonHint">
                          {lessonIssueCount === 0
                            ? "This lesson is ready."
                            : `${lessonIssueCount} issue${lessonIssueCount === 1 ? "" : "s"} still need attention.`}
                        </div>
                      </div>

                      <div className="moduleBuilderInlineActions">
                        <span className={`moduleBuilderStatePill ${lessonIssueCount === 0 ? "ready" : "pending"}`}>
                          {lessonIssueCount === 0 ? "Ready" : "Needs work"}
                        </span>
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

                    <div className="moduleBuilderLessonFields">
                      <label className="label">
                        Lesson Title
                        <input
                          className="input"
                          value={lesson.title}
                          onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                          placeholder={buildLessonTitle(lessonIndex)}
                        />
                      </label>

                      <label className="label">
                        Lesson Summary
                        <textarea
                          className="input textarea"
                          rows={3}
                          value={lesson.summary}
                          onChange={(e) => updateLesson(lesson.id, { summary: e.target.value })}
                          placeholder="Optional summary for this lesson."
                        />
                      </label>
                    </div>

                    <div className="moduleBuilderResourceGroup">
                      <div className="moduleBuilderResourceHeader">
                        <div>
                          <div className="moduleBuilderCardTitle">Learning resources</div>
                          <div className="moduleBuilderCardHint">Add text, video, and PDF items directly inside this lesson.</div>
                        </div>
                      </div>

                      <div className="moduleBuilderResourceAdder">
                        {Object.entries(ITEM_TYPE_META).map(([type, meta]) => (
                          <button
                            key={`${lesson.id}-${type}`}
                            className="moduleBuilderAdderButton"
                            type="button"
                            onClick={() => addItemToLesson(lesson.id, type)}
                          >
                            Add {meta.label}
                          </button>
                        ))}
                      </div>

                      {lesson.items.length === 0 ? (
                        <div className="emptyState">
                          <div className="emptyTitle">No resources yet</div>
                          <div className="emptyText">Add at least one learning resource to complete this lesson.</div>
                        </div>
                      ) : (
                        <div className="moduleBuilderResourceList">
                          {lesson.items.map((item, itemIndex) => {
                            const itemIssues = audit?.itemAudits?.find((entry) => entry.itemId === item.id)?.itemIssues || [];

                            return (
                              <div className="moduleBuilderResourceCard" key={item.id}>
                                <div className="moduleBuilderResourceCardHeader">
                                  <div className="moduleBuilderResourceMeta">
                                    <div className="moduleBuilderLessonIndex">Resource {itemIndex + 1}</div>
                                    <div className="moduleBuilderLessonName">{item.title || buildItemTitle(item.type, itemIndex)}</div>
                                  </div>

                                  <div className="moduleBuilderInlineActions">
                                    <span className={`moduleBuilderStatePill ${itemIssues.length === 0 ? "ready" : "pending"}`}>
                                      {itemIssues.length === 0 ? "Ready" : "Needs work"}
                                    </span>
                                    <button
                                      className="moduleBuilderGhostButton"
                                      type="button"
                                      onClick={() => moveLessonItem(lesson.id, item.id, "up")}
                                      disabled={itemIndex === 0}
                                    >
                                      Up
                                    </button>
                                    <button
                                      className="moduleBuilderGhostButton"
                                      type="button"
                                      onClick={() => moveLessonItem(lesson.id, item.id, "down")}
                                      disabled={itemIndex === lesson.items.length - 1}
                                    >
                                      Down
                                    </button>
                                    <button className="moduleBuilderGhostButton" type="button" onClick={() => duplicateItem(lesson.id, item.id)}>
                                      Duplicate
                                    </button>
                                    <button className="dangerButton dangerButtonSmall" type="button" onClick={() => removeItem(lesson.id, item.id)}>
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                <div className="moduleBuilderResourceFields">
                                  <label className="label">
                                    Resource Type
                                    <select
                                      className="input"
                                      value={item.type}
                                      onChange={(e) => updateItemType(lesson.id, item.id, e.target.value)}
                                    >
                                      {Object.entries(ITEM_TYPE_META).map(([value, meta]) => (
                                        <option key={value} value={value}>
                                          {meta.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="label">
                                    Resource Title
                                    <input
                                      className="input"
                                      value={item.title}
                                      onChange={(e) => updateLessonItem(lesson.id, item.id, { title: e.target.value })}
                                      placeholder={buildItemTitle(item.type, itemIndex)}
                                    />
                                  </label>
                                </div>

                                <div className="moduleBuilderHelperText">{ITEM_TYPE_META[item.type].helper}</div>

                                <div className="moduleBuilderResourceContent">
                                  {item.type === "text" ? (
                                    <label className="label">
                                      Text Content
                                      <textarea
                                        className="input textarea"
                                        rows={8}
                                        value={item.content?.text || ""}
                                        onChange={(e) =>
                                          updateLessonItem(lesson.id, item.id, (entry) => ({
                                            ...entry,
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
                                        value={item.content?.url || ""}
                                        onChange={(e) =>
                                          updateLessonItem(lesson.id, item.id, (entry) => ({
                                            ...entry,
                                            content: { url: e.target.value }
                                          }))
                                        }
                                        placeholder={ITEM_TYPE_META[item.type].placeholder}
                                      />
                                    </label>
                                  )}
                                </div>

                                {itemIssues.length === 0 ? (
                                  <div className="moduleBuilderInlineReady">This resource is ready for publish.</div>
                                ) : (
                                  <div className="moduleBuilderInlineIssue">{itemIssues.join(" • ")}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="moduleBuilderCard">
          <div className="moduleBuilderCardHeader">
            <div>
              <div className="moduleBuilderCardTitle">Final assessment</div>
              <div className="moduleBuilderCardHint">The linked exam appears at the end of this module.</div>
            </div>
          </div>

          <div className="moduleBuilderAssessmentGrid">
            <label className="label">
              Linked Final Exam
              <select
                className="input"
                value={linkedExamId}
                onChange={(e) => {
                  setLinkedExamId(e.target.value);
                  clearNotice();
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

            <div className="moduleBuilderSectionActions">
              <button className="navButton" type="button" onClick={() => persistModule("draft", { openExamBuilder: true })} disabled={saving}>
                {linkedExam ? "Open Linked Exam Builder" : "Create Final Exam"}
              </button>
            </div>
          </div>

          <div className="moduleBuilderHelperText">
            A module cannot be published until a final exam is linked.
          </div>

          {linkedExam ? (
            <div className="moduleBuilderLinkedExamCard">
              <div className="moduleBuilderLinkedExamLabel">Currently linked</div>
              <div className="moduleBuilderLinkedExamTitle">{linkedExam.examTitle}</div>
            </div>
          ) : null}
        </section>

        <section className="moduleBuilderCard">
          <div className="moduleBuilderCardHeader">
            <div>
              <div className="moduleBuilderCardTitle">Publish readiness</div>
              <div className="moduleBuilderCardHint">Use this list to finish the module before publishing.</div>
            </div>
          </div>

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

        <section className="moduleBuilderActionBar">
          <button className="navButton" type="button" onClick={() => navigate("/modules")}>
            Back to Modules
          </button>
          <button className="navButton" type="button" onClick={() => persistModule("draft")} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button className="navButton primary" type="button" onClick={() => persistModule("published")} disabled={!isComplete || saving}>
            {saving ? "Saving..." : "Publish Module"}
          </button>
        </section>
      </div>
    </div>
  );
}
