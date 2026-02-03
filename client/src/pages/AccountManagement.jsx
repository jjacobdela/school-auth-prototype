import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/accountManagement.css";
import { me, clearToken } from "../api/auth";

function getToken() {
  return localStorage.getItem("token");
}

function validatePasswordPolicy(pw) {
  const p = (pw || "").trim();

  if (p.length === 0) return "New password is required.";
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(p)) return "Password must contain at least one number.";

  return null;
}

async function apiPatch(path, body) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body || {})
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.message || "Request failed";
    throw new Error(msg);
  }

  return data;
}

export default function AccountManagement() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState("corporate");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Profile edit
  const [editingName, setEditingName] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // "Touched" state to avoid showing red validation on initial load
  const [pwTouchedNew, setPwTouchedNew] = useState(false);
  const [pwTouchedConfirm, setPwTouchedConfirm] = useState(false);
  const [pwTouchedCurrent, setPwTouchedCurrent] = useState(false);

  // Track submit attempts (so we can show validation after the user presses Update)
  const [pwSubmitAttempted, setPwSubmitAttempted] = useState(false);

  // Status banners
  const [profileStatus, setProfileStatus] = useState({ type: "", message: "" }); // success | error
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await me();
        if (!mounted) return;

        setUser(data.user);
        setFullNameDraft(data.user?.fullName || "");
      } catch (err) {
        if (!mounted) return;
        clearToken();
        navigate("/login");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Only show inline errors when user interacts OR submits
  const shouldShowPwErrors = useMemo(() => {
    return pwSubmitAttempted || pwTouchedNew || pwTouchedConfirm;
  }, [pwSubmitAttempted, pwTouchedNew, pwTouchedConfirm]);

  const passwordPolicyError = useMemo(() => {
    if (!shouldShowPwErrors) return null;

    // If the user hasn't typed anything at all and hasn't submitted,
    // we still don't want to show "required".
    const np = (newPassword || "").trim();
    const cp = (confirmNewPassword || "").trim();

    // Show policy errors if:
    // - user touched the new password field, OR
    // - user tried to submit
    const shouldValidateNew =
      pwSubmitAttempted || pwTouchedNew || (np.length > 0) || (cp.length > 0);

    if (!shouldValidateNew) return null;

    return validatePasswordPolicy(newPassword);
  }, [shouldShowPwErrors, newPassword, confirmNewPassword, pwSubmitAttempted, pwTouchedNew]);

  const passwordMatchError = useMemo(() => {
    if (!shouldShowPwErrors) return null;

    const np = (newPassword || "").trim();
    const cp = (confirmNewPassword || "").trim();

    // Only validate "confirm" when confirm was touched OR submit was attempted
    const shouldValidateConfirm = pwSubmitAttempted || pwTouchedConfirm;

    if (!shouldValidateConfirm) return null;

    if (cp.length === 0) return "Please confirm your new password.";
    if (np !== cp) return "Passwords do not match.";
    return null;
  }, [shouldShowPwErrors, newPassword, confirmNewPassword, pwSubmitAttempted, pwTouchedConfirm]);

  const passwordInlineError = useMemo(() => {
    // Priority: policy first, then mismatch
    return passwordPolicyError || passwordMatchError;
  }, [passwordPolicyError, passwordMatchError]);

  const canSubmitPassword = useMemo(() => {
    if (savingPassword) return false;
    if (!currentPassword.trim()) return false;

    // Even if we hide errors, do not allow submission with blank new/confirm
    if (!newPassword.trim()) return false;
    if (!confirmNewPassword.trim()) return false;

    // Always enforce correctness before enabling submit
    if (validatePasswordPolicy(newPassword)) return false;
    if (newPassword.trim() !== confirmNewPassword.trim()) return false;

    return true;
  }, [savingPassword, currentPassword, newPassword, confirmNewPassword]);

  async function refreshMe() {
    const data = await me();
    setUser(data.user);
    setFullNameDraft(data.user?.fullName || "");
  }

  async function onSaveName() {
    try {
      setProfileStatus({ type: "", message: "" });
      setPasswordStatus({ type: "", message: "" });

      const nextName = (fullNameDraft || "").trim();
      if (nextName.length < 2) {
        setProfileStatus({ type: "error", message: "Full name must be at least 2 characters." });
        return;
      }

      setSavingProfile(true);
      await apiPatch("http://localhost:5001/api/auth/profile", { fullName: nextName });

      await refreshMe();
      setEditingName(false);
      setProfileStatus({ type: "success", message: "Name updated successfully." });
    } catch (err) {
      setProfileStatus({ type: "error", message: err.message || "Failed to update name." });
    } finally {
      setSavingProfile(false);
    }
  }

  function onCancelName() {
    setProfileStatus({ type: "", message: "" });
    setEditingName(false);
    setFullNameDraft(user?.fullName || "");
  }

  async function onUpdatePassword(e) {
    e.preventDefault();

    try {
      setProfileStatus({ type: "", message: "" });
      setPasswordStatus({ type: "", message: "" });

      // Mark submit attempted so errors appear if invalid
      setPwSubmitAttempted(true);

      if (!currentPassword.trim()) {
        setPasswordStatus({ type: "error", message: "Current password is required." });
        return;
      }

      const policyErr = validatePasswordPolicy(newPassword);
      if (policyErr) {
        setPasswordStatus({ type: "error", message: policyErr });
        return;
      }

      if (newPassword.trim() !== confirmNewPassword.trim()) {
        setPasswordStatus({ type: "error", message: "Passwords do not match." });
        return;
      }

      setSavingPassword(true);

      await apiPatch("http://localhost:5001/api/auth/password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim()
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Reset validation state so page doesn't look "errored" after success
      setPwTouchedCurrent(false);
      setPwTouchedNew(false);
      setPwTouchedConfirm(false);
      setPwSubmitAttempted(false);

      setPasswordStatus({ type: "success", message: "Password updated successfully." });
    } catch (err) {
      setPasswordStatus({ type: "error", message: err.message || "Failed to update password." });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="accountPage">
        <header className="accountHeader">
          <div className="accountHeaderLeft">
            <div className="brandMark" aria-hidden="true">
              {theme === "school" ? "PS" : "HR"}
            </div>
            <div className="brandText">
              <div className="brandTitle">Account Management</div>
              <div className="brandSubtitle">Loading your profile…</div>
            </div>
          </div>
        </header>
        <div className="accountContent">
          <div className="accountCard">
            <div className="accountSkeleton" />
          </div>
        </div>
      </div>
    );
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt).toLocaleString() : "—";

  return (
    <div className="accountPage">
      <header className="accountHeader">
        <div className="accountHeaderLeft">
          <div className="brandMark" aria-hidden="true">
            {theme === "school" ? "PS" : "HR"}
          </div>
          <div className="brandText">
            <div className="brandTitle">Account Management</div>
            <div className="brandSubtitle">View your profile information and maintain account security.</div>
          </div>
        </div>

        <div className="accountHeaderRight">
          <label className="themePickerLabel">
            Theme
            <select className="themePicker" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="corporate">A — Corporate Light</option>
              <option value="school">C — School Branded</option>
            </select>
          </label>

          <div className="headerActions">
            <button className="navButton" type="button" onClick={() => navigate("/dashboard")}>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="accountContent">
        <div className="accountCard">
          <div className="accountGrid">
            {/* LEFT: Profile */}
            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Profile</div>
                <div className="panelBadge">Active</div>
              </div>

              {profileStatus.message ? (
                <div className={`statusBanner ${profileStatus.type}`}>
                  <div className="statusBannerTitle">
                    {profileStatus.type === "success" ? "Success" : "Action needed"}
                  </div>
                  <div className="statusBannerText">{profileStatus.message}</div>
                </div>
              ) : null}

              <div className="profileCard">
                <div className="profileRow">
                  <div className="profileLabel">Full Name</div>

                  {!editingName ? (
                    <div className="profileValueRow">
                      <div className="profileValue">{user?.fullName || "—"}</div>
                      <button className="pillButton" type="button" onClick={() => setEditingName(true)}>
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="profileEditRow">
                      <input
                        className="input"
                        value={fullNameDraft}
                        onChange={(e) => setFullNameDraft(e.target.value)}
                        placeholder="Enter full name"
                      />
                      <div className="profileEditActions">
                        <button
                          className={`navButton primary ${savingProfile ? "disabled" : ""}`}
                          type="button"
                          onClick={onSaveName}
                          disabled={savingProfile}
                        >
                          {savingProfile ? "Saving…" : "Save"}
                        </button>
                        <button className="navButton" type="button" onClick={onCancelName} disabled={savingProfile}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="profileRow">
                  <div className="profileLabel">Email</div>
                  <div className="profileValue">{user?.email || "—"}</div>
                </div>

                <div className="profileRow">
                  <div className="profileLabel">Account Created</div>
                  <div className="profileValue">{createdAt}</div>
                </div>
              </div>

              <div className="noteCard">
                <div className="noteTitle">Note</div>
                <ul className="noteList">
                  <li>Email changes are typically handled by HR/Admin for audit and security.</li>
                  <li>Name changes are allowed for correcting formatting (e.g., capitalization).</li>
                </ul>
              </div>
            </section>

            {/* RIGHT: Security */}
            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Security</div>
                <div className="panelHint">Change your password regularly.</div>
              </div>

              {passwordStatus.message ? (
                <div className={`statusBanner ${passwordStatus.type}`}>
                  <div className="statusBannerTitle">
                    {passwordStatus.type === "success" ? "Success" : "Action needed"}
                  </div>
                  <div className="statusBannerText">{passwordStatus.message}</div>
                </div>
              ) : null}

              <form className="securityForm" onSubmit={onUpdatePassword}>
                <label className="label">
                  Current Password
                  <input
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPwTouchedCurrent(true);
                    }}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </label>

                <label className="label">
                  New Password (min 8 chars)
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPwTouchedNew(true);
                    }}
                    onBlur={() => setPwTouchedNew(true)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                </label>

                <label className="label">
                  Confirm New Password
                  <input
                    type="password"
                    className="input"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setPwTouchedConfirm(true);
                    }}
                    onBlur={() => setPwTouchedConfirm(true)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </label>

                {/* Show inline error only after interaction or submit */}
                {shouldShowPwErrors && passwordInlineError ? (
                  <div className="inlineError" role="alert">
                    {passwordInlineError}
                  </div>
                ) : null}

                <button
                  className={`navButton primary ${!canSubmitPassword ? "disabled" : ""}`}
                  type="submit"
                  disabled={!canSubmitPassword}
                  title={!canSubmitPassword ? "Fill and fix password fields first" : "Update password"}
                >
                  {savingPassword ? "Updating…" : "Update Password"}
                </button>

                <div className="securityFootnote">
                  If you forget your password, HR/Admin reset can be implemented later as a separate workflow.
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
