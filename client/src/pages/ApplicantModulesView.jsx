import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyModules } from "../api/myModules";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/examCreation.css";

export default function ApplicantModulesView() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyModules();
        setModules(res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="examPage">
      <header className="appHeader">
        <div className="appHeaderLeft">
          <div className="brandMark">MB</div>
          <div className="brandText">
            <div className="brandTitle">My Modules</div>
            <div className="brandSubtitle">Only modules assigned to you</div>
          </div>
        </div>

        <div className="appHeaderRight">
          <button className="navButton" onClick={() => navigate("/applicant-dashboard")}>
            ← Back
          </button>
        </div>
      </header>

      <div className="examContent">
        <div className="examCard">
          <div className="section">
            {loading && <div className="hintBox">Loading...</div>}
            {error && <div className="error">{error}</div>}

            {!loading && !error && modules.length === 0 && (
              <div className="emptyState">
                <div className="emptyTitle">No assigned modules</div>
                <div className="emptyText">Wait for an admin to assign you a module.</div>
              </div>
            )}

            <div className="questionList">
              {modules.map((m) => (
                <div key={m._id} className="questionCard">
                  <div className="questionHeader">
                    <div className="questionHeaderLeft">
                      <div className="questionTitle" style={{ fontWeight: 700 }}>
                        {m.title || "(Untitled)"}
                      </div>
                    </div>

                    <div className="questionHeaderRight">
                      <button className="navButton" onClick={() => navigate(`/modules/${m._id}/view`)}>
                        View
                      </button>
                    </div>
                  </div>

                  <div className="questionBody">
                    <div className="questionMeta">{m.description || ""}</div>
                    <div className="questionMeta">
                      <span>{m.pagesCount} pages</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
