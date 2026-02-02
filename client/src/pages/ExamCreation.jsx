import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

const QUESTION_TYPES = {
  multiple_choice: "Multiple Choice",
  true_false: "True or False",
  narrative: "Narrative"
};

const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "Administration",
  "Finance",
  "IT / MIS",
  "Operations",
  "Guidance",
  "Registrar",
  "Faculty",
  "Maintenance",
  "Security",
  "Other"
];

const DRAFTS_KEY = "exam_drafts_v1";

function createEmptyQuestion(type) {
  if (type === "multiple_choice") {
    return {
      id: crypto.randomUUID(),
      type,
      prompt: "",
      choices: ["", "", "", ""],
      correctIndex: 0
    };
  }

  if (type === "true_false") {
    return {
      id: crypto.randomUUID(),
      type,
      prompt: "",
      correctBoolean: true
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "narrative",
    prompt: "",
    rubric: ""
  };
}

function reorderByIds(list, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return list;

  const sourceIndex = list.findIndex((q) => q.id === sourceId);
  const targetIndex = list.findIndex((q) => q.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) return list;

  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function safeParseJSON(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readDrafts() {
  const raw = localStorage.getItem(DRAFTS_KEY);
  const parsed = raw ? safeParseJSON(raw, []) : [];
  return Array.isArray(parsed) ? parsed : [];
}

function writeDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function summarizeQuestions(questions) {
  const total = Array.isArray(questions) ? questions.length : 0;
  let mc = 0;
  let tf = 0;
  let nar = 0;

  for (const q of questions || []) {
    if (q?.type === "multiple_choice") mc++;
    if (q?.type === "true_false") tf++;
    if (q?.type === "narrative") nar++;
  }

  return { total, mc, tf, nar };
}

export default function ExamCreation() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState("corporate");

  const [examTitle, setExamTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [newQuestionType, setNewQuestionType] = useState("multiple_choice");
  const [questions, setQuestions] = useState([]);

  // Draft UI
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftSort, setDraftSort] = useState("updated_desc"); // updated_desc | updated_asc | title_asc
  const [draftToDelete, setDraftToDelete] = useState(null);

  // Danger confirmation (drawer)
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Drag & drop
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragStartIndexRef = useRef(-1);

  const totalQuestions = questions.length;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const isValid = useMemo(() => {
    if (!examTitle.trim()) return false;
    if (!department.trim()) return false;

    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) return false;

    for (const q of questions) {
      if (!q.prompt?.trim()) return false;

      if (q.type === "multiple_choice") {
        const filled = (q.choices || []).filter((c) => (c || "").trim().length > 0);
        if (filled.length < 2) return false;

        if (typeof q.correctIndex !== "number") return false;
        if (q.correctIndex < 0 || q.correctIndex > (q.choices || []).length - 1) return false;
        if (!(q.choices || [])[q.correctIndex]?.trim()) return false;
      }

      if (q.type === "true_false") {
        if (typeof q.correctBoolean !== "boolean") return false;
      }

      if (q.type === "narrative") {
        if (!q.rubric?.trim()) return false;
      }
    }

    return true;
  }, [examTitle, department, durationMinutes, questions]);

  function addQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion(newQuestionType)]);
  }

  function removeQuestion(questionId) {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }

  function updateQuestion(questionId, patch) {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...patch } : q)));
  }

  function updateChoice(questionId, choiceIndex, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.type !== "multiple_choice") return q;

        const nextChoices = [...(q.choices || [])];
        nextChoices[choiceIndex] = value;

        return { ...q, choices: nextChoices };
      })
    );
  }

  function addChoice(questionId) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.type !== "multiple_choice") return q;
        return { ...q, choices: [...(q.choices || []), ""] };
      })
    );
  }

  function removeChoice(questionId, choiceIndex) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.type !== "multiple_choice") return q;

        if ((q.choices || []).length <= 2) return q;

        const nextChoices = (q.choices || []).filter((_, idx) => idx !== choiceIndex);

        let nextCorrect = q.correctIndex;
        if (choiceIndex === q.correctIndex) nextCorrect = 0;
        if (choiceIndex < q.correctIndex) nextCorrect = Math.max(0, q.correctIndex - 1);

        return { ...q, choices: nextChoices, correctIndex: nextCorrect };
      })
    );
  }

  function toggleDrafts() {
    setDraftsOpen((v) => !v);
    setDraftToDelete(null);
    setConfirmClearAll(false);
  }

  function resetBuilderToNewDraft() {
    const hasWork =
      examTitle.trim().length > 0 ||
      questions.length > 0 ||
      String(durationMinutes).trim().length > 0;

    const ok = !hasWork
      ? true
      : window.confirm("Start a new draft? Your current unsaved changes will be cleared.");

    if (!ok) return;

    setCurrentDraftId(null);
    setExamTitle("");
    setDepartment(DEPARTMENT_OPTIONS[0]);
    setDurationMinutes(30);
    setNewQuestionType("multiple_choice");
    setQuestions([]);

    setDraftsOpen(false);
    setDraftToDelete(null);
    setConfirmClearAll(false);
  }

  function saveDraft() {
    const now = Date.now();

    const payload = {
      examTitle: examTitle.trim(),
      department: department.trim(),
      durationMinutes: Number(durationMinutes),
      questions
    };

    const drafts = readDrafts();

    if (currentDraftId) {
      const next = drafts.map((d) =>
        d.id === currentDraftId ? { ...d, updatedAt: now, payload, name: payload.examTitle || d.name } : d
      );
      writeDrafts(next);
      alert("Draft updated.");
      return;
    }

    const newDraft = {
      id: crypto.randomUUID(),
      name: payload.examTitle || "Untitled Exam",
      createdAt: now,
      updatedAt: now,
      payload
    };

    writeDrafts([newDraft, ...drafts]);
    setCurrentDraftId(newDraft.id);
    alert("Draft saved.");
  }

  function loadDraftById(draftId) {
    const drafts = readDrafts();
    const found = drafts.find((d) => d.id === draftId);

    if (!found || !found.payload) {
      alert("Draft not found.");
      return;
    }

    const p = found.payload;

    setExamTitle(p.examTitle || "");
    setDepartment(p.department || DEPARTMENT_OPTIONS[0]);
    setDurationMinutes(p.durationMinutes || 30);
    setQuestions(Array.isArray(p.questions) ? p.questions : []);

    setCurrentDraftId(found.id);
    setDraftsOpen(false);
    setDraftToDelete(null);
    setConfirmClearAll(false);
    alert("Draft loaded.");
  }

  function deleteDraftById(draftId) {
    const drafts = readDrafts();
    const next = drafts.filter((d) => d.id !== draftId);
    writeDrafts(next);

    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }

    setDraftToDelete(null);
    alert("Draft deleted.");
  }

  function clearAllDrafts() {
    writeDrafts([]);
    setCurrentDraftId(null);
    setDraftToDelete(null);
    setConfirmClearAll(false);
    alert("All drafts cleared.");
  }

  function clearDraftSelection() {
    setCurrentDraftId(null);
    alert("Draft link cleared. Saving will create a new draft.");
  }

  function publishExam() {
    const payload = {
      examTitle: examTitle.trim(),
      department: department.trim(),
      durationMinutes: Number(durationMinutes),
      questions
    };

    console.log("Exam payload (frontend-only):", payload);
    alert("Exam payload logged (backend to be added later).");
  }

  // Drag handlers
  function onDragStart(e, questionId, index) {
    setDraggingId(questionId);
    setDragOverId(null);
    dragStartIndexRef.current = index;

    e.dataTransfer.setData("text/plain", questionId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e, questionId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(questionId);
  }

  function onDrop(e, questionId) {
    e.preventDefault();

    const sourceId = draggingId || e.dataTransfer.getData("text/plain");
    const targetId = questionId;

    setQuestions((prev) => reorderByIds(prev, sourceId, targetId));

    setDraggingId(null);
    setDragOverId(null);
    dragStartIndexRef.current = -1;
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
    dragStartIndexRef.current = -1;
  }

  const drafts = readDrafts();

  const filteredDrafts = useMemo(() => {
    const q = draftSearch.trim().toLowerCase();
    let list = drafts;

    if (q) {
      list = list.filter((d) => {
        const p = d.payload || {};
        const title = (p.examTitle || d.name || "").toLowerCase();
        const dept = (p.department || "").toLowerCase();
        return title.includes(q) || dept.includes(q);
      });
    }

    if (draftSort === "updated_asc") {
      list = [...list].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    } else if (draftSort === "title_asc") {
      list = [...list].sort((a, b) => {
        const ta = ((a.payload?.examTitle || a.name || "") + "").toLowerCase();
        const tb = ((b.payload?.examTitle || b.name || "") + "").toLowerCase();
        return ta.localeCompare(tb);
      });
    } else {
      list = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    return list;
  }, [drafts, draftSearch, draftSort]);

  return (
    <div className={`examPage ${draftsOpen ? "drawerOpen" : ""}`}>
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark" aria-hidden="true">
            {theme === "school" ? "PS" : "HR"}
          </div>
          <div className="brandText">
            <div className="brandTitle">{theme === "school" ? "Partner School" : "Exam Builder"}</div>
            <div className="brandSubtitle">
              {theme === "school" ? "Hiring Assessment System" : "Create and manage hiring assessments"}
            </div>
          </div>
        </div>

        <div className="appHeaderRight">
          <label className="themePickerLabel">
            Theme
            <select className="themePicker" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="corporate">A — Corporate Light</option>
              <option value="school">C — School Branded</option>
            </select>
          </label>

          <div className="headerActions">
            <button className="navButton" onClick={() => navigate("/dashboard")}>
              Back
            </button>

            <button className="navButton" onClick={resetBuilderToNewDraft}>
              New Draft
            </button>

            <button className="navButton" onClick={toggleDrafts}>
              Drafts
            </button>

            <button className="navButton" onClick={saveDraft}>
              Save Draft
            </button>

            <button
              className={`navButton primary ${!isValid ? "disabled" : ""}`}
              onClick={publishExam}
              disabled={!isValid}
              title={!isValid ? "Complete required fields first" : "Publish (API later)"}
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      {draftsOpen ? <div className="drawerBackdrop" onClick={toggleDrafts} /> : null}

      <aside className={`draftDrawer ${draftsOpen ? "open" : ""}`} aria-hidden={!draftsOpen}>
        <div className="draftDrawerHeader">
          <div className="draftDrawerTitle">Drafts</div>
          <button className="navButton" type="button" onClick={toggleDrafts}>
            Close
          </button>
        </div>

        <div className="draftDrawerControls">
          <input
            className="drawerInput"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Search by title or department..."
          />

          <select className="drawerSelect" value={draftSort} onChange={(e) => setDraftSort(e.target.value)}>
            <option value="updated_desc">Sort: Recently updated</option>
            <option value="updated_asc">Sort: Oldest updated</option>
            <option value="title_asc">Sort: Title A → Z</option>
          </select>
        </div>

        <div className="draftDrawerBody">
          {filteredDrafts.length === 0 ? (
            <div className="drawerEmpty">
              <div className="drawerEmptyTitle">No drafts found</div>
              <div className="drawerEmptyText">
                {drafts.length === 0
                  ? "Click “Save Draft” to create your first draft."
                  : "Try a different search term."}
              </div>
            </div>
          ) : (
            <div className="drawerList">
              {filteredDrafts.map((d) => {
                const p = d.payload || {};
                const summary = summarizeQuestions(p.questions || []);
                const title = (p.examTitle || d.name || "Untitled Exam").trim();
                const dept = (p.department || "").trim();
                const updated = d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "Unknown";

                const isActive = currentDraftId === d.id;

                return (
                  <div className={`drawerCard ${isActive ? "active" : ""}`} key={d.id}>
                    <div className="drawerCardTop">
                      <div className="drawerCardTitle">{title}</div>
                      {isActive ? <div className="drawerBadge">Linked</div> : null}
                    </div>

                    <div className="drawerCardMeta">
                      <span className="drawerPill">Dept: {dept || "—"}</span>
                      <span className="drawerPill">Q: {summary.total}</span>
                      <span className="drawerPill">MC {summary.mc} · TF {summary.tf} · Nar {summary.nar}</span>
                    </div>

                    <div className="drawerCardTime">Updated: {updated}</div>

                    <div className="drawerCardActions">
                      <button className="navButton primary" type="button" onClick={() => loadDraftById(d.id)}>
                        Load
                      </button>

                      <button
                        className="navButton"
                        type="button"
                        onClick={() => {
                          setDraftToDelete(d.id);
                          setConfirmClearAll(false);
                        }}
                      >
                        Delete…
                      </button>
                    </div>

                    {draftToDelete === d.id ? (
                      <div className="confirmRow">
                        <div className="confirmText">Delete this draft?</div>
                        <div className="confirmActions">
                          <button
                            className="dangerButton dangerButtonSmall"
                            type="button"
                            onClick={() => deleteDraftById(d.id)}
                          >
                            Delete
                          </button>
                          <button className="navButton" type="button" onClick={() => setDraftToDelete(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="drawerDangerZone">
            <div className="drawerDangerTitle">Danger Zone</div>
            <div className="drawerDangerText">
              This permanently removes drafts from this browser’s storage.
            </div>

            <div className="dangerBlock">
              <div className="dangerBlockInfo">
                <div className="dangerBlockLabel">Clear all drafts</div>
                <div className="dangerBlockHint">
                  Removes every saved draft. Use only if you really need a reset.
                </div>
              </div>

              {drafts.length === 0 ? (
                <button className="navButton" type="button" disabled>
                  No drafts
                </button>
              ) : !confirmClearAll ? (
                <button
                  className="navButton"
                  type="button"
                  onClick={() => {
                    setConfirmClearAll(true);
                    setDraftToDelete(null);
                  }}
                >
                  Clear all…
                </button>
              ) : (
                <div className="dangerInlineConfirm">
                  <button className="dangerButton dangerButtonSmall" type="button" onClick={clearAllDrafts}>
                    Clear all
                  </button>
                  <button className="navButton" type="button" onClick={() => setConfirmClearAll(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="examContent">
        <div className="examCard">
          <div className="topRow">
            <div className="pageTitleArea">
              <h1 className="pageTitle">Exam Creation</h1>
              <p className="pageSubtitle">Use “New Draft” to start a fresh exam without leaving the page.</p>
            </div>

            <div className="draftIndicator">
              <div className="draftIndicatorLabel">Linked Draft</div>
              <div className="draftIndicatorValue">{currentDraftId ? "Yes" : "No"}</div>
              {currentDraftId ? (
                <button className="miniButton" type="button" onClick={clearDraftSelection}>
                  Unlink
                </button>
              ) : null}
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <div className="sectionTitle">Exam Details</div>
              <div className={`statusChip ${isValid ? "ready" : "incomplete"}`}>{isValid ? "Ready" : "Incomplete"}</div>
            </div>

            <div className="examMetaGrid">
              <label className="label">
                Exam Title
                <input className="input" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
              </label>

              <label className="label">
                Department
                <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Duration (minutes)
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </label>

              <div className="examStats">
                <div className="examStatItem">
                  <div className="examStatLabel">Total Questions</div>
                  <div className="examStatValue">{totalQuestions}</div>
                </div>
                <div className="examStatItem">
                  <div className="examStatLabel">Theme</div>
                  <div className="examStatValue">{theme === "school" ? "School" : "Corporate"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <div className="sectionTitle">Questions</div>
              <div className="sectionHint">Drag using the handle to reorder.</div>
            </div>

            <div className="questionToolbar">
              <div className="questionToolbarLeft">
                <label className="label">
                  New question type
                  <select className="input" value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)}>
                    {Object.entries(QUESTION_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="navButton primary" type="button" onClick={addQuestion}>
                  Add Question
                </button>
              </div>

              <div className="questionToolbarRight">
                <button className="navButton" type="button" onClick={() => setQuestions([])} disabled={questions.length === 0}>
                  Clear Questions
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="emptyState">
                <div className="emptyTitle">No questions yet</div>
                <div className="emptyText">Choose a type above, then click “Add Question”.</div>
              </div>
            ) : null}

            <div className="questionList">
              {questions.map((q, index) => {
                const isDragging = draggingId === q.id;
                const isDragOver = dragOverId === q.id && draggingId && draggingId !== q.id;

                return (
                  <div
                    className={`questionCard ${isDragging ? "dragging" : ""} ${isDragOver ? "dragOver" : ""}`}
                    key={q.id}
                    onDragOver={(e) => onDragOver(e, q.id)}
                    onDrop={(e) => onDrop(e, q.id)}
                  >
                    <div className="questionHeader">
                      <div className="questionHeaderLeft">
                        <div
                          className="dragHandle"
                          draggable
                          onDragStart={(e) => onDragStart(e, q.id, index)}
                          onDragEnd={onDragEnd}
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          ⋮⋮
                        </div>

                        <div className="questionNumber">Q{index + 1}</div>
                        <div className="questionTypePill">{QUESTION_TYPES[q.type] || q.type}</div>
                      </div>

                      <button className="dangerButton" type="button" onClick={() => removeQuestion(q.id)}>
                        Remove
                      </button>
                    </div>

                    <label className="label">
                      Prompt
                      <textarea className="input textarea" value={q.prompt} onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })} rows={3} />
                    </label>

                    {q.type === "multiple_choice" ? (
                      <div className="mcSection">
                        <div className="mcHeader">
                          <div className="mcTitle">Choices</div>
                          <button className="navButton" type="button" onClick={() => addChoice(q.id)}>
                            Add Choice
                          </button>
                        </div>

                        <div className="mcChoices">
                          {q.choices.map((choice, cIdx) => (
                            <div className="mcChoiceRow" key={`${q.id}-choice-${cIdx}`}>
                              <label className="mcRadio">
                                <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === cIdx} onChange={() => updateQuestion(q.id, { correctIndex: cIdx })} />
                                <span className="mcRadioText">Correct</span>
                              </label>

                              <input className="input mcChoiceInput" value={choice} onChange={(e) => updateChoice(q.id, cIdx, e.target.value)} placeholder={`Choice ${cIdx + 1}`} />

                              <button className="dangerButton dangerButtonSmall" type="button" onClick={() => removeChoice(q.id, cIdx)} disabled={q.choices.length <= 2}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {q.type === "true_false" ? (
                      <div className="tfSection">
                        <div className="tfLabel">Correct answer</div>
                        <div className="tfButtons">
                          <button type="button" className={`tfBtn ${q.correctBoolean ? "active" : ""}`} onClick={() => updateQuestion(q.id, { correctBoolean: true })}>
                            True
                          </button>
                          <button type="button" className={`tfBtn ${!q.correctBoolean ? "active" : ""}`} onClick={() => updateQuestion(q.id, { correctBoolean: false })}>
                            False
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {q.type === "narrative" ? (
                      <label className="label">
                        Rubric / expected answer guide
                        <textarea className="input textarea" value={q.rubric} onChange={(e) => updateQuestion(q.id, { rubric: e.target.value })} rows={3} />
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!isValid ? (
              <div className="hintBox">
                <div className="hintTitle">Complete required fields to publish</div>
                <ul className="hintList">
                  <li>Exam title, department, and duration</li>
                  <li>Every question must have a prompt</li>
                  <li>Multiple choice: at least 2 filled choices and a filled “correct” choice</li>
                  <li>Narrative: rubric must be filled</li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
