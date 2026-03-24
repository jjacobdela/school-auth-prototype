import React from "react";
import { useNavigate } from "react-router-dom";
import { useViewerContext } from "../components/viewerContext";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";

export default function ApplicantDashboard() {
  const navigate = useNavigate();
  const { viewer, loading } = useViewerContext() || {};

  const displayName = viewer?.fullName || viewer?.email || "Applicant";

  return (
    <section className="canvaContent">
      <div className="canvaPanel">
        {loading && <div className="canvaState">Loading...</div>}

        {!loading && (
          <>
            <div className="canvaHero">
              <div className="canvaHeroTitle">Welcome back, {displayName}</div>
              <div className="canvaHeroDesc">
                Complete assigned training, submit requests when needed, and take the exam once you are ready.
              </div>
            </div>

            <div className="canvaGrid">
              <button className="canvaTile" onClick={() => navigate("/applicant/modules")}>
                <div className="canvaTileHeader">
                  <div className="canvaTileTitle">Modules</div>
                  <div className="canvaPill">Learning</div>
                </div>
                <div className="canvaTileBody">Open assigned modules, review material, and track your next tasks.</div>
                <div className="canvaTileFooter">Open</div>
              </button>

              <button className="canvaTile" onClick={() => navigate("/exam")}>
                <div className="canvaTileHeader">
                  <div className="canvaTileTitle">Exam</div>
                  <div className="canvaPill">Assessment</div>
                </div>
                <div className="canvaTileBody">Check assessment availability and complete the exam from one place.</div>
                <div className="canvaTileFooter">Open</div>
              </button>
            </div>

            <div className="canvaInfoRow">
              <div className="canvaInfoCard">
                <div className="canvaInfoLabel">Account</div>
                <div className="canvaInfoValue">{viewer?.email}</div>
              </div>

              <div className="canvaInfoCard">
                <div className="canvaInfoLabel">Status</div>
                <div className="canvaInfoValue">{viewer?.status || "Active"}</div>
              </div>

              <div className="canvaInfoCard">
                <div className="canvaInfoLabel">Role</div>
                <div className="canvaInfoValue">{viewer?.role || "applicant"}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
