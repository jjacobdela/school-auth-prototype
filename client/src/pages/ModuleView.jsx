import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useViewerContext } from "../components/viewerContext";
import { getModule } from "../api/modules";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";
import "../styles/moduleView.css";

const RESOURCE_META = {
  text: {
    label: "Text lesson",
    action: null
  },
  pdf: {
    label: "PDF resource",
    action: "Open PDF"
  },
  video: {
    label: "Video lesson",
    action: "Open Video"
  }
};

function countResources(lessons) {
  return (lessons || []).reduce((sum, lesson) => sum + (lesson?.items?.length || 0), 0);
}

function buildExamBuilderUrl(moduleId, moduleTitle, examId) {
  const params = new URLSearchParams();
  if (moduleId) params.set("moduleId", moduleId);
  if (moduleTitle) params.set("moduleTitle", moduleTitle);
  if (examId) params.set("examId", examId);

  const query = params.toString();
  return query ? `/exam-creation?${query}` : "/exam-creation";
}

export default function ModuleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { viewer } = useViewerContext() || {};

  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);

  const email = (viewer?.email || "").toLowerCase();
  const isAdmin = viewer?.role === "admin" || email === "admin@gmail.com";

  useEffect(() => {
    let mounted = true;

    async function fetchModule() {
      try {
        setLoading(true);
        const res = await getModule(id);
        if (!mounted) return;
        setModule(res?.data || null);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setModule(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchModule();
    return () => {
      mounted = false;
    };
  }, [id]);

  const lessons = useMemo(() => (Array.isArray(module?.lessons) ? module.lessons : []), [module]);
  const resourcesCount = useMemo(() => countResources(lessons), [lessons]);
  const finalExam = module?.finalExam || null;
  const finalExamId = finalExam?._id || module?.finalExamId || "";

  if (loading) {
    return <div className="hintBox">Loading module...</div>;
  }

  if (!module) {
    return <div className="hintBox">Module not found.</div>;
  }

  return (
    <div className="moduleViewPage">
      <section className="moduleViewHero">
        <div className="moduleViewHeroCopy">
          <div className="moduleViewEyebrow">{isAdmin ? "Module Workspace" : "Learning Module"}</div>
          <h1 className="moduleViewTitle">{module.title || "Untitled module"}</h1>
          <p className="moduleViewSubtitle">{module.description || "No description added yet."}</p>
        </div>

        <div className="moduleViewHeroMeta">
          <div className={`moduleViewStatusChip ${module.status === "published" ? "ready" : "incomplete"}`}>
            {module.status === "published" ? "Published" : "Draft"}
          </div>

          <div className="moduleViewStatGrid">
            <div className="moduleViewStatCard">
              <div className="moduleViewStatLabel">Lessons</div>
              <div className="moduleViewStatValue">{lessons.length}</div>
            </div>

            <div className="moduleViewStatCard">
              <div className="moduleViewStatLabel">Resources</div>
              <div className="moduleViewStatValue">{resourcesCount}</div>
            </div>

            <div className="moduleViewStatCard">
              <div className="moduleViewStatLabel">Final Exam</div>
              <div className="moduleViewStatValue">{finalExamId ? "Linked" : "Pending"}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="moduleViewLayout">
        <main className="moduleViewMain">
          {lessons.length === 0 ? (
            <section className="moduleViewCard emptyState">
              <div className="emptyTitle">No lessons added yet</div>
              <div className="emptyText">This module does not have any lesson content yet.</div>
            </section>
          ) : (
            lessons.map((lesson, lessonIndex) => (
              <section className="moduleViewCard" key={`${lesson.title || "lesson"}-${lessonIndex}`}>
                <div className="moduleViewSectionHeader">
                  <div>
                    <div className="moduleViewSectionLabel">Lesson {lessonIndex + 1}</div>
                    <h2 className="moduleViewSectionTitle">{lesson.title || `Lesson ${lessonIndex + 1}`}</h2>
                  </div>
                  <div className="moduleViewSectionMeta">
                    {(lesson.items || []).length} resource{(lesson.items || []).length === 1 ? "" : "s"}
                  </div>
                </div>

                {lesson.summary ? <p className="moduleViewLessonSummary">{lesson.summary}</p> : null}

                <div className="moduleViewResourceList">
                  {(lesson.items || []).map((item, itemIndex) => (
                    <article className="moduleViewResourceCard" key={`${item.title || "item"}-${itemIndex}`}>
                      <div className="moduleViewResourceTop">
                        <div>
                          <div className="moduleViewResourceLabel">{RESOURCE_META[item.type]?.label || "Learning resource"}</div>
                          <div className="moduleViewResourceTitle">{item.title || `Resource ${itemIndex + 1}`}</div>
                        </div>
                        <span className="moduleViewResourceType">{(item.type || "text").toUpperCase()}</span>
                      </div>

                      {item.type === "text" ? (
                        <div className="moduleViewTextBlock">{item?.content?.text || "No text content added yet."}</div>
                      ) : (
                        <div className="moduleViewResourceActionRow">
                          <div className="moduleViewResourceHint">{item?.content?.url || "No resource URL added yet."}</div>
                          {item?.content?.url ? (
                            <a
                              className="navButton"
                              href={item.content.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {RESOURCE_META[item.type]?.action || "Open Resource"}
                            </a>
                          ) : null}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        <aside className="moduleViewSidebar">
          <section className="moduleViewCard">
            <div className="moduleViewSidebarTitle">Module Actions</div>
            <div className="moduleViewActionStack">
              <button className="navButton" type="button" onClick={() => navigate("/modules")}>
                Back to Modules
              </button>
              {isAdmin ? (
                <button className="navButton primary" type="button" onClick={() => navigate(`/modules/${id}/edit`)}>
                  Edit Module
                </button>
              ) : null}
            </div>
          </section>

          <section className="moduleViewCard">
            <div className="moduleViewSidebarTitle">Final Assessment</div>

            {finalExam ? (
              <div className="moduleViewExamCard">
                <div className="moduleViewExamLabel">Linked final exam</div>
                <div className="moduleViewExamTitle">{finalExam.examTitle}</div>
                <div className="moduleViewExamMeta">
                  Status: {finalExam.status === "published" ? "Published" : "Draft"}
                </div>

                <div className="moduleViewActionStack">
                  {isAdmin ? (
                    <button
                      className="navButton"
                      type="button"
                      onClick={() => navigate(buildExamBuilderUrl(id, module.title || "", finalExamId))}
                    >
                      Manage Final Exam
                    </button>
                  ) : (
                    <button className="navButton" type="button" onClick={() => navigate("/exam")}>
                      Open Assessment Area
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="moduleViewExamCard pending">
                <div className="moduleViewExamLabel">No final exam linked yet</div>
                <div className="moduleViewExamText">
                  {isAdmin
                    ? "Create or attach a final exam so this module can finish with an assessment."
                    : "A final exam has not been assigned to this module yet."}
                </div>

                {isAdmin ? (
                  <div className="moduleViewActionStack">
                    <button
                      className="navButton"
                      type="button"
                      onClick={() => navigate(buildExamBuilderUrl(id, module.title || "", ""))}
                    >
                      Create Final Exam
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
