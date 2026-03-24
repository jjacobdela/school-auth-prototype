import React from "react";
import { useNavigate } from "react-router-dom";
import { useViewerContext } from "../components/viewerContext";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";

export default function ApplicantExam() {
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
              <div className="canvaHeroTitle">Assessment</div>
              <div className="canvaHeroDesc">
                Exam availability, attempt history, and completion details for {displayName} will appear here.
              </div>
            </div>

            <div className="canvaEmpty">
              <div className="canvaEmptyTitle">No assigned exam yet</div>
              <div className="canvaEmptyDesc">
                When an assessment is assigned, it will appear here with instructions and submission status.
              </div>

              <div className="canvaEmptyActions">
                <button className="canvaPrimary" onClick={() => navigate("/applicant/modules")}>
                  View Modules
                </button>
                <button className="canvaSecondary" onClick={() => navigate("/applicant-dashboard")}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
