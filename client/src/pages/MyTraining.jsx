import React from "react";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

export default function MyTraining({ contents = [] }) {
  return (
    <div className="examPage">
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark">TR</div>
          <div className="brandText">
            <div className="brandTitle">My Training</div>
            <div className="brandSubtitle">Files and training content assigned to your account.</div>
          </div>
        </div>
      </header>

      <div className="examContent">
        <div className="examCard">
          {contents.length === 0 ? (
            <div className="emptyState">
              <div className="emptyTitle">No training content yet</div>
              <div className="emptyText">Assigned modules and supporting files will appear here when available.</div>
            </div>
          ) : (
            contents.map((c) => (
              <div key={c._id} className="section">
                <div className="sectionHeader">
                  <div className="sectionTitle">{c.title}</div>
                </div>

                {c.type === "text" && <div className="hintBox">{c.textContent}</div>}

                {c.fileUrl && (
                  <a
                    className="navButton"
                    href={`${import.meta.env.VITE_API_URL || "http://localhost:5002"}${c.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open File
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
