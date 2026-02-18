import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getModule } from "../api/modules";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

export default function ModuleView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModule();
    // eslint-disable-next-line
  }, [id]);

  async function fetchModule() {
    try {
      const res = await getModule(id);
      setModule(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="hintBox">Loading module...</div>;
  }

  if (!module) {
    return <div className="hintBox">Module not found</div>;
  }

  return (
    <div className="examPage">
      {/* HEADER */}
      <header className="appHeader">
        <div className="appHeaderLeft">
          <button
            className="navButton"
            onClick={() => navigate("/modules")}
          >
            ← Back
          </button>

          <div className="brandText">
            {/* BIG + BOLD TITLE */}
            <div
              className="brandTitle"
              style={{ fontSize: "1.6rem", fontWeight: "700" }}
            >
              {module.title}
            </div>
            <div className="brandSubtitle">
              {module.description || "No description"}
            </div>
          </div>
        </div>

        <div className="appHeaderRight">
          <button
            className="navButton primary"
            onClick={() => navigate(`/modules/${id}/edit`)}
          >
            Edit Module
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="examContent">
        <div className="examCard">
          {module.pages.length === 0 && (
            <div className="emptyState">
              <div className="emptyTitle">No pages</div>
              <div className="emptyText">
                This module does not have any pages yet.
              </div>
            </div>
          )}

          {module.pages.map((page, index) => (
            <div key={index} className="section">
              {/* PAGE HEADER */}
              <div className="questionHeader">
                <div className="questionHeaderLeft">
                  <div
                    className="questionTitle"
                    style={{ fontWeight: "600" }}
                  >
                    Page {index + 1}: {page.title}
                  </div>
                </div>

                <div className="questionHeaderRight">
                  <div className="questionTypePill">
                    {page.type.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* PAGE CONTENT */}
              <div className="questionBody">
                {/* TEXT */}
                {page.type === "text" && (
                  <div className="hintBox">
                    {page.content?.text || "No content"}
                  </div>
                )}

                {/* PDF */}
                {page.type === "pdf" && page.content?.url && (
                  <a
                    href={page.content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="navButton"
                  >
                    Open PDF
                  </a>
                )}

                {/* VIDEO */}
                {page.type === "video" && page.content?.url && (
                  <video
                    src={page.content.url}
                    controls
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      marginTop: "10px"
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
