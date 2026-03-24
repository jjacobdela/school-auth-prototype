import React from "react";
import { useNavigate } from "react-router-dom";
import { useViewerContext } from "../components/viewerContext";
import "../styles/form.css";
import "../styles/dashboard.css";
import "../styles/applicantDashboard.css";

export default function ApplicantModules() {
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
              <div className="canvaHeroTitle">Training Modules</div>
              <div className="canvaHeroDesc">
                Assigned modules will appear here alongside progress, status, and completion details for {displayName}.
              </div>
            </div>

            <div className="canvaEmpty">
              <div className="canvaEmptyTitle">No modules assigned yet</div>
              <div className="canvaEmptyDesc">
                When training is assigned to your account, this page will list the material and your progress through it.
              </div>

              <div className="canvaEmptyActions">
                <button className="canvaPrimary" onClick={() => navigate("/request-training")}>
                  Request Training
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
