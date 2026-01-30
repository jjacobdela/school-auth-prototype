import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
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

export default function ExamCreation() {
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState("");
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [newQuestionType, setNewQuestionType] = useState("multiple_choice");
  const [questions, setQuestions] = useState([]);

  // Drag & drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragStartIndexRef = useRef(-1);

  const totalQuestions = questions.length;

  const isValid = useMemo(() => {
    if (!examTitle.trim()) return false;
    if (!department.trim()) return false;

    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) return false;

    for (const q of questions) {
      if (!q.prompt.trim()) return false;

      if (q.type === "multiple_choice") {
        const filled = q.choices.filter((c) => c.trim().length > 0);
        if (filled.length < 2) return false;

        if (q.correctIndex < 0 || q.correctIndex > q.choices.length - 1) return false;
        if (!q.choices[q.correctIndex]?.trim()) return false;
      }

      if (q.type === "narrative") {
        if (!q.rubric.trim()) return false;
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

        const nextChoices = [...q.choices];
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
        return { ...q, choices: [...q.choices, ""] };
      })
    );
  }

  function removeChoice(questionId, choiceIndex) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.type !== "multiple_choice") return q;

        if (q.choices.length <= 2) return q;

        const nextChoices = q.choices.filter((_, idx) => idx !== choiceIndex);

        let nextCorrect = q.correctIndex;
        if (choiceIndex === q.correctIndex) nextCorrect = 0;
        if (choiceIndex < q.correctIndex) nextCorrect = Math.max(0, q.correctIndex - 1);

        return { ...q, choices: nextChoices, correctIndex: nextCorrect };
      })
    );
  }

  function saveDraft() {
    const payload = {
      examTitle: examTitle.trim(),
      department: department.trim(),
      durationMinutes: Number(durationMinutes),
      questions
    };

    localStorage.setItem("exam_draft", JSON.stringify(payload));
    alert("Draft saved.");
  }

  function loadDraft() {
    const raw = localStorage.getItem("exam_draft");
    if (!raw) return alert("No draft found.");

    try {
      const parsed = JSON.parse(raw);

      setExamTitle(parsed.examTitle || "");
      setDepartment(parsed.department || DEPARTMENT_OPTIONS[0]);
      setDurationMinutes(parsed.durationMinutes || 30);
      setQuestions(Array.isArray(parsed.questions) ? parsed.questions : []);

      alert("Draft loaded.");
    } catch {
      alert("Draft is corrupted and cannot be loaded.");
    }
  }

  function clearDraft() {
    localStorage.removeItem("exam_draft");
    alert("Draft cleared.");
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

    // Required for Firefox to start dragging
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

  return (
    <div className="examPage">
      {/* NAV BAR (like dashboard) */}
      <header className="examHeader">
        <button className="navButton" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>

        <button className="navButton" onClick={loadDraft}>
          Load Draft
        </button>

        <button className="navButton" onClick={saveDraft}>
          Save Draft
        </button>

        <button className="navButton" onClick={clearDraft}>
          Clear Draft
        </button>

        <button
          className={`navButton primary ${!isValid ? "disabled" : ""}`}
          onClick={publishExam}
          disabled={!isValid}
          title={!isValid ? "Complete required fields first" : "Publish (API later)"}
        >
          Publish Exam
        </button>
      </header>

      <div className="examContent">
        <div className="examCard">
          <h1 className="title">Exam Creation</h1>
          <p className="subtitle">
            Drag questions using the handle to reorder. Save/Load drafts locally for now.
          </p>

          <div className="examMetaGrid">
            <label className="label">
              Exam Title
              <input
                className="input"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g., IT Support Hiring Assessment"
              />
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
                <div className="examStatLabel">Status</div>
                <div className="examStatValue">{isValid ? "Ready" : "Incomplete"}</div>
              </div>
            </div>
          </div>

          <div className="examDivider" />

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
                      {/* Drag handle */}
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

                      <div className="questionNumber">Question {index + 1}</div>

                      <div className="questionTypePill">{QUESTION_TYPES[q.type] || q.type}</div>
                    </div>

                    <button className="dangerButton" type="button" onClick={() => removeQuestion(q.id)}>
                      Remove
                    </button>
                  </div>

                  <label className="label">
                    Prompt
                    <textarea
                      className="input textarea"
                      value={q.prompt}
                      onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                      placeholder="Enter the question prompt..."
                      rows={3}
                    />
                  </label>

                  {q.type === "multiple_choice" ? (
                    <div className="mcSection">
                      <div className="mcHeader">
                        <div className="mcTitle">Choices</div>
                        <button className="button secondary mcAddChoiceBtn" type="button" onClick={() => addChoice(q.id)}>
                          Add Choice
                        </button>
                      </div>

                      <div className="mcChoices">
                        {q.choices.map((choice, cIdx) => (
                          <div className="mcChoiceRow" key={`${q.id}-choice-${cIdx}`}>
                            <label className="mcRadio">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correctIndex === cIdx}
                                onChange={() => updateQuestion(q.id, { correctIndex: cIdx })}
                              />
                              <span className="mcRadioText">Correct</span>
                            </label>

                            <input
                              className="input mcChoiceInput"
                              value={choice}
                              onChange={(e) => updateChoice(q.id, cIdx, e.target.value)}
                              placeholder={`Choice ${cIdx + 1}`}
                            />

                            <button
                              className="dangerButton dangerButtonSmall"
                              type="button"
                              onClick={() => removeChoice(q.id, cIdx)}
                              disabled={q.choices.length <= 2}
                              title={q.choices.length <= 2 ? "At least 2 choices required" : "Remove choice"}
                            >
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
                        <button
                          type="button"
                          className={`tfBtn ${q.correctBoolean ? "active" : ""}`}
                          onClick={() => updateQuestion(q.id, { correctBoolean: true })}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          className={`tfBtn ${!q.correctBoolean ? "active" : ""}`}
                          onClick={() => updateQuestion(q.id, { correctBoolean: false })}
                        >
                          False
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {q.type === "narrative" ? (
                    <label className="label">
                      Rubric / expected answer guide
                      <textarea
                        className="input textarea"
                        value={q.rubric}
                        onChange={(e) => updateQuestion(q.id, { rubric: e.target.value })}
                        placeholder="Describe what a good answer should include..."
                        rows={3}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
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

              <button className="button" type="button" onClick={addQuestion}>
                Add Question
              </button>
            </div>

            <div className="questionToolbarRight">
              <button
                className="button secondary"
                type="button"
                onClick={() => setQuestions([])}
                disabled={questions.length === 0}
              >
                Clear Questions
              </button>
            </div>
          </div>
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
  );
}
