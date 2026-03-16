import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/userManagement.css";
import { me, getToken } from "../api/auth";

const API_BASE = "http://localhost:5001/api";

async function apiRequest(path, { method = "GET", body } = {}) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordPolicyError(pw) {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function generateTempPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];

  const base = [
    pick(letters),
    pick(letters),
    pick(letters),
    pick(numbers),
    pick(numbers),
    pick(symbols),
    pick(letters),
    pick(numbers)
  ];

  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  return base.join("");
}

export default function UserManagement() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState("school");

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

  const [users, setUsers] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // list | create

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState("updated_desc"); // updated_desc | created_desc | name_asc

  const [uiMessage, setUiMessage] = useState({ type: "", title: "", text: "" }); // success | error | info
  const [selectedUser, setSelectedUser] = useState(null);

  // Create applicant form
  const [appFullName, setAppFullName] = useState("");
  const [appEmail, setAppEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [appConfirm, setAppConfirm] = useState("");
  const [creating, setCreating] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    password: false,
    confirm: false
  });

  // Reset password modal
  const [pwUser, setPwUser] = useState(null);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwTouched, setPwTouched] = useState({ pw: false, confirm: false });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function loadViewer() {
      try {
        const data = await me();
        if (!mounted) return;
        setViewer(data.user);
      } catch {
        if (!mounted) return;
        navigate("/login");
      }
    }

    loadViewer();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const isAdmin = useMemo(() => {
    const email = (viewer?.email || "").toLowerCase();
    return viewer?.role === "admin" || email === "admin@gmail.com";
  }, [viewer]);

  async function loadUsers() {
    setUiMessage({ type: "", title: "", text: "" });
    setLoading(true);

    try {
      const data = await apiRequest("/users");
      const list = Array.isArray(data?.users) ? data.users : [];
      setUsers(list);

      if (list.length === 0) {
        setUiMessage({ type: "info", title: "No users", text: "No users found." });
      }
    } catch (err) {
      setUsers([]);
      setUiMessage({
        type: "error",
        title: "Unable to load users",
        text: err.message || "Failed to load users."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...users];

    // Always show only applicants
    list = list.filter((u) => (u.role || "") === "applicant");

    if (q) {
      list = list.filter((u) => {
        const name = (u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    if (statusFilter !== "All") {
      list = list.filter((u) => (u.status || "Active") === statusFilter);
    }

    if (sort === "name_asc") {
      list.sort((a, b) => ((a.fullName || "") + "").localeCompare((b.fullName || "") + ""));
    } else if (sort === "created_desc") {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    }

    return list;
  }, [users, search, statusFilter, sort]);

  const summary = useMemo(() => {
    let total = users.length;
    let applicants = 0;
    let admins = 0;
    for (const u of users) {
      if (u?.role === "applicant") applicants += 1;
      if (u?.role === "admin") admins += 1;
    }
    return { total, applicants, admins };
  }, [users]);

  function openUser(u) {
    setSelectedUser(u);
    setUiMessage({ type: "", title: "", text: "" });
  }

  function closeUser() {
    setSelectedUser(null);
  }

  function resetCreateForm() {
    setAppFullName("");
    setAppEmail("");
    setAppPassword("");
    setAppConfirm("");
    setTouched({ fullName: false, email: false, password: false, confirm: false });
  }

  function goToCreateApplicant() {
    if (!isAdmin) {
      setUiMessage({
        type: "error",
        title: "Not authorized",
        text: "Admin access is required to create applicant accounts."
      });
      return;
    }

    setUiMessage({ type: "", title: "", text: "" });
    setSelectedUser(null);
    setViewMode("create");
    resetCreateForm();
    setAppPassword(generateTempPassword());
  }

  function goToList() {
    setSelectedUser(null);
    setViewMode("list");
  }

  const fullNameErr = useMemo(() => {
    if (!touched.fullName) return null;
    if (!appFullName.trim()) return "Full name is required.";
    if (appFullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (appFullName.trim().length > 80) return "Full name must be 80 characters or less.";
    return null;
  }, [appFullName, touched.fullName]);

  const emailErr = useMemo(() => {
    if (!touched.email) return null;
    if (!appEmail.trim()) return "Email is required.";
    if (!isValidEmail(appEmail.trim())) return "Enter a valid email address.";
    return null;
  }, [appEmail, touched.email]);

  const passwordErr = useMemo(() => {
    if (!touched.password) return null;
    return passwordPolicyError(appPassword);
  }, [appPassword, touched.password]);

  const confirmErr = useMemo(() => {
    if (!touched.confirm) return null;
    if (!appConfirm) return "Please confirm the password.";
    if (appConfirm !== appPassword) return "Passwords do not match.";
    return null;
  }, [appConfirm, appPassword, touched.confirm]);

  const canCreate = useMemo(() => {
    if (!isAdmin) return false;
    if (!appFullName.trim()) return false;
    if (!isValidEmail(appEmail.trim())) return false;
    if (passwordPolicyError(appPassword)) return false;
    if (appConfirm !== appPassword) return false;
    return true;
  }, [isAdmin, appFullName, appEmail, appPassword, appConfirm]);

  async function createApplicant(e) {
    e.preventDefault();

    if (!isAdmin) {
      setUiMessage({
        type: "error",
        title: "Not authorized",
        text: "Admin access is required to create applicant accounts."
      });
      return;
    }

    setTouched({ fullName: true, email: true, password: true, confirm: true });

    if (!canCreate) {
      setUiMessage({
        type: "error",
        title: "Fix the form errors",
        text: "Please correct the highlighted fields before creating the account."
      });
      return;
    }

    setUiMessage({ type: "", title: "", text: "" });
    setCreating(true);

    try {
      const payload = {
        fullName: appFullName.trim(),
        email: appEmail.trim().toLowerCase(),
        password: appPassword
      };

      await apiRequest("/users/applicants", { method: "POST", body: payload });

      setUiMessage({
        type: "success",
        title: "Applicant created",
        text: `Applicant account created: ${payload.email}`
      });

      await loadUsers();
      goToList();
    } catch (err) {
      setUiMessage({
        type: "error",
        title: "Create failed",
        text: err.message || "Failed to create applicant."
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleUserStatus(u) {
    setUiMessage({ type: "", title: "", text: "" });

    try {
      const id = u._id;
      const current = u.status || "Active";
      const nextStatus = current === "Disabled" ? "Active" : "Disabled";

      const data = await apiRequest(`/users/${id}/status`, {
        method: "PATCH",
        body: { status: nextStatus }
      });

      const updated = data?.user ? data.user : { ...u, status: nextStatus, updatedAt: Date.now() };

      setUsers((prev) => prev.map((x) => (x._id === id ? { ...x, ...updated } : x)));
      setSelectedUser((prev) => (prev && prev._id === id ? { ...prev, ...updated } : prev));

      setUiMessage({
        type: "success",
        title: "User updated",
        text: `User status updated: ${updated.fullName} is now ${updated.status}.`
      });
    } catch (err) {
      setUiMessage({
        type: "error",
        title: "Update failed",
        text: err.message || "Failed to update user status."
      });
    }
  }

  async function deleteUser(u) {
    const ok = window.confirm(`Delete ${u.fullName}? This cannot be undone.`);
    if (!ok) return;

    setUiMessage({ type: "", title: "", text: "" });

    try {
      await apiRequest(`/users/${u._id}`, { method: "DELETE" });

      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      setSelectedUser((prev) => (prev && prev._id === u._id ? null : prev));

      setUiMessage({
        type: "success",
        title: "User deleted",
        text: `User deleted: ${u.fullName}`
      });
    } catch (err) {
      setUiMessage({
        type: "error",
        title: "Delete failed",
        text: err.message || "Failed to delete user."
      });
    }
  }

  // ===== Reset Password modal helpers =====
  function openPasswordModal(u) {
    setUiMessage({ type: "", title: "", text: "" });
    setPwUser(u);
    setPwNew("");
    setPwConfirm("");
    setPwTouched({ pw: false, confirm: false });
  }

  function closePasswordModal() {
    setPwUser(null);
    setPwNew("");
    setPwConfirm("");
    setPwTouched({ pw: false, confirm: false });
    setPwSaving(false);
  }

  const pwErr = useMemo(() => {
    if (!pwTouched.pw) return null;
    return passwordPolicyError(pwNew);
  }, [pwNew, pwTouched.pw]);

  const pwConfirmErr = useMemo(() => {
    if (!pwTouched.confirm) return null;
    if (!pwConfirm) return "Please confirm the password.";
    if (pwConfirm !== pwNew) return "Passwords do not match.";
    return null;
  }, [pwConfirm, pwNew, pwTouched.confirm]);

  const canSavePw = useMemo(() => {
    if (!isAdmin) return false;
    if (!pwUser?._id) return false;
    if (passwordPolicyError(pwNew)) return false;
    if (pwConfirm !== pwNew) return false;
    return true;
  }, [isAdmin, pwUser, pwNew, pwConfirm]);

  async function saveResetPassword() {
    if (!pwUser?._id) return;

    setPwTouched({ pw: true, confirm: true });

    if (!canSavePw) {
      setUiMessage({
        type: "error",
        title: "Fix the form errors",
        text: "Please correct the password fields before saving."
      });
      return;
    }

    setPwSaving(true);
    setUiMessage({ type: "", title: "", text: "" });

    try {
      await apiRequest(`/users/${pwUser._id}/password`, {
        method: "PATCH",
        body: { password: pwNew }
      });

      setUiMessage({
        type: "success",
        title: "Password updated",
        text: `Password reset successful for ${pwUser.email}.`
      });

      closePasswordModal();
      await loadUsers();
    } catch (err) {
      setUiMessage({
        type: "error",
        title: "Password reset failed",
        text: err.message || "Failed to reset password."
      });
      setPwSaving(false);
    }
  }

  return (
    <div className="userMgmtPage">
      <header className="userMgmtHeader">
        <div className="userMgmtHeaderLeft">
          <div className="brandMark" aria-hidden="true">
            {theme === "school" ? "PS" : "HR"}
          </div>
          <div className="brandText">
            <div className="brandTitle">User Management</div>
            <div className="brandSubtitle">
              Admin creates and manages applicant accounts.
            </div>
          </div>
        </div>

        <div className="userMgmtHeaderRight">
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

            <button className="navButton" type="button" onClick={loadUsers} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            {viewMode === "list" ? (
              <button
                className={`navButton primary ${!isAdmin ? "disabled" : ""}`}
                type="button"
                onClick={goToCreateApplicant}
                disabled={!isAdmin}
              >
                Create Applicant
              </button>
            ) : (
              <button className="navButton" type="button" onClick={goToList}>
                Back to Users
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="userMgmtContent">
        <div className="userMgmtCard">
          <div className="userMgmtTopRow">
            <div className="userMgmtTitleBlock">
              <h1 className="pageTitle">{viewMode === "list" ? "Applicants" : "Create Applicant"}</h1>
              <p className="pageSubtitle">
                {viewMode === "list"
                  ? "Click a row to view applicant details. Actions stay on the right."
                  : "Create an applicant account for hiring assessments. Share credentials securely."}
              </p>

              {viewer ? (
                <div className="viewerLine">
                  Signed in as <span className="viewerStrong">{viewer.fullName}</span> ({viewer.email}){" "}
                  <span className={`rolePill ${isAdmin ? "admin" : "applicant"}`}>
                    {isAdmin ? "Admin" : "Applicant"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="summaryTiles">
              <div className="summaryTile">
                <div className="summaryLabel">Total</div>
                <div className="summaryValue">{summary.total}</div>
              </div>
              <div className="summaryTile">
                <div className="summaryLabel">Applicants</div>
                <div className="summaryValue">{summary.applicants}</div>
              </div>
              <div className="summaryTile">
                <div className="summaryLabel">Admins</div>
                <div className="summaryValue">{summary.admins}</div>
              </div>
            </div>
          </div>

          {!isAdmin ? (
            <div className="statusBanner warning">
              <div className="statusBannerTitle">Limited access</div>
              <div className="statusBannerText">Admin access is required to create applicant accounts.</div>
            </div>
          ) : null}

          {uiMessage.text ? (
            <div className={`statusBanner ${uiMessage.type}`}>
              <div className="statusBannerTitle">{uiMessage.title || "Status"}</div>
              <div className="statusBannerText">{uiMessage.text}</div>
            </div>
          ) : null}

          <div className="topActionsRow">
            <div className="segmented">
              <button className={`segBtn ${viewMode === "list" ? "active" : ""}`} type="button" onClick={goToList}>
                Applicants
              </button>
              <button
                className={`segBtn ${viewMode === "create" ? "active" : ""}`}
                type="button"
                onClick={goToCreateApplicant}
                disabled={!isAdmin}
                title={!isAdmin ? "Admin only" : "Create applicant"}
              >
                Create Applicant
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <>
              <div className="toolbar">
                <div className="toolbarLeft">
                  <label className="label">
                    Search
                    <input
                      className="input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or email..."
                    />
                  </label>

                  <label className="label">
                    Status
                    <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </label>

                  <label className="label">
                    Sort
                    <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="updated_desc">Recently updated</option>
                      <option value="created_desc">Newest created</option>
                      <option value="name_asc">Name A → Z</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="tableWrap">
                <div className="userTableHeader">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Status</div>
                  <div>Created</div>
                  <div className="tableActionsCol">Actions</div>
                </div>

                {loading ? (
                  <div className="tableEmpty">Loading applicants…</div>
                ) : filtered.length === 0 ? (
                  <div className="tableEmpty">No applicants match your filters.</div>
                ) : (
                  <div className="userTableBody">
                    {filtered.map((u) => {
                      const key = u._id || `${u.email}-${u.fullName}`;
                      const status = u.status || "Active";
                      const role = u.role || "applicant";

                      return (
                        <div
                          className="userRow"
                          key={key}
                          role="button"
                          tabIndex={0}
                          onClick={() => openUser(u)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") openUser(u);
                          }}
                          title="Click to view details"
                        >
                          <div className="cellName">
                            <div className="nameStrong">{u.fullName || "—"}</div>
                          </div>

                          <div className="cellEmail">{u.email || "—"}</div>

                          <div className="cellRole">
                            <span className="pill pillApplicant">{role}</span>
                          </div>

                          <div className="cellStatus">
                            <span className={`statusPill ${status === "Disabled" ? "disabled" : "active"}`}>
                              {status}
                            </span>
                          </div>

                          <div className="cellCreated">{formatDate(u.createdAt)}</div>

                          {/* IMPORTANT: prevent row click when pressing action buttons */}
                          <div className="cellActions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="navButton"
                              type="button"
                              onClick={() => openPasswordModal(u)}
                              disabled={!isAdmin}
                              title={!isAdmin ? "Admin only" : "Reset password"}
                            >
                              Reset Password
                            </button>

                            <button
                              className="navButton"
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              disabled={!isAdmin}
                              title={!isAdmin ? "Admin only" : "Toggle status"}
                            >
                              {status === "Disabled" ? "Enable" : "Disable"}
                            </button>

                            <button
                              className="dangerButton"
                              type="button"
                              onClick={() => deleteUser(u)}
                              disabled={!isAdmin}
                              title={!isAdmin ? "Admin only" : "Delete user"}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedUser ? (
                <>
                  <div className="modalBackdrop" onClick={closeUser} />
                  <div className="modal" role="dialog" aria-modal="true">
                    <div className="modalHeader">
                      <div className="modalTitle">Applicant Details</div>
                      <button className="navButton" type="button" onClick={closeUser}>
                        Close
                      </button>
                    </div>

                    <div className="modalBody">
                      <div className="detailGrid">
                        <div className="detailItem">
                          <div className="detailLabel">Full Name</div>
                          <div className="detailValue">{selectedUser.fullName || "—"}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Email</div>
                          <div className="detailValue">{selectedUser.email || "—"}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Role</div>
                          <div className="detailValue">{selectedUser.role || "applicant"}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Status</div>
                          <div className="detailValue">{selectedUser.status || "Active"}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Created</div>
                          <div className="detailValue">{formatDate(selectedUser.createdAt)}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Updated</div>
                          <div className="detailValue">
                            {formatDate(selectedUser.updatedAt || selectedUser.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {pwUser ? (
                <>
                  <div className="modalBackdrop" onClick={closePasswordModal} />
                  <div className="modal" role="dialog" aria-modal="true">
                    <div className="modalHeader">
                      <div className="modalTitle">Reset Password</div>
                      <button className="navButton" type="button" onClick={closePasswordModal} disabled={pwSaving}>
                        Close
                      </button>
                    </div>

                    <div className="modalBody">
                      <div className="detailGrid">
                        <div className="detailItem">
                          <div className="detailLabel">User</div>
                          <div className="detailValue">{pwUser.fullName || "—"}</div>
                        </div>
                        <div className="detailItem">
                          <div className="detailLabel">Email</div>
                          <div className="detailValue">{pwUser.email || "—"}</div>
                        </div>
                      </div>

                      <div className="createCard" style={{ marginTop: 12 }}>
                        <div className="createHeader">
                          <div className="createTitle">New Password</div>
                          <div className="createHint">
                            Set a temporary password and share it securely with the applicant.
                          </div>
                        </div>

                        <div className="createForm">
                          <label className="label">
                            Password
                            <div className="pwRow">
                              <input
                                className={`input ${pwErr ? "inputError" : ""}`}
                                value={pwNew}
                                onChange={(e) => setPwNew(e.target.value)}
                                onBlur={() => setPwTouched((p) => ({ ...p, pw: true }))}
                                placeholder="Min 8 characters"
                              />
                              <button
                                className="navButton"
                                type="button"
                                onClick={() => {
                                  setPwNew(generateTempPassword());
                                  setPwTouched((p) => ({ ...p, pw: true }));
                                }}
                                disabled={pwSaving}
                              >
                                Generate
                              </button>
                            </div>
                            {pwErr ? <div className="fieldError">{pwErr}</div> : null}
                          </label>

                          <label className="label">
                            Confirm Password
                            <input
                              className={`input ${pwConfirmErr ? "inputError" : ""}`}
                              value={pwConfirm}
                              onChange={(e) => setPwConfirm(e.target.value)}
                              onBlur={() => setPwTouched((p) => ({ ...p, confirm: true }))}
                              placeholder="Re-enter password"
                            />
                            {pwConfirmErr ? <div className="fieldError">{pwConfirmErr}</div> : null}
                          </label>

                          <div className="createFooter">
                            <div className="createNote">
                              Recommended: applicant should change password on first login (feature can be added later).
                            </div>

                            <div className="createActions">
                              <button className="navButton" type="button" onClick={closePasswordModal} disabled={pwSaving}>
                                Cancel
                              </button>
                              <button
                                className={`navButton primary ${!canSavePw || pwSaving ? "disabled" : ""}`}
                                type="button"
                                onClick={saveResetPassword}
                                disabled={!canSavePw || pwSaving}
                              >
                                {pwSaving ? "Saving…" : "Update Password"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="createWrap">
              <div className="createCard">
                <div className="createHeader">
                  <div className="createTitle">Applicant Account</div>
                  <div className="createHint">
                    Create a login for an applicant. Email is used as the unique identifier.
                  </div>
                </div>

                <form className="createForm" onSubmit={createApplicant}>
                  <div className="createGrid">
                    <label className="label">
                      Full Name
                      <input
                        className={`input ${fullNameErr ? "inputError" : ""}`}
                        value={appFullName}
                        onChange={(e) => setAppFullName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                        placeholder="e.g., Juan Dela Cruz"
                      />
                      {fullNameErr ? <div className="fieldError">{fullNameErr}</div> : null}
                    </label>

                    <label className="label">
                      Email
                      <input
                        className={`input ${emailErr ? "inputError" : ""}`}
                        value={appEmail}
                        onChange={(e) => setAppEmail(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        placeholder="e.g., applicant@domain.com"
                      />
                      {emailErr ? <div className="fieldError">{emailErr}</div> : null}
                    </label>

                    <label className="label">
                      Temporary Password
                      <div className="pwRow">
                        <input
                          className={`input ${passwordErr ? "inputError" : ""}`}
                          value={appPassword}
                          onChange={(e) => setAppPassword(e.target.value)}
                          onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                          placeholder="Min 8 characters"
                        />
                        <button
                          className="navButton"
                          type="button"
                          onClick={() => {
                            setAppPassword(generateTempPassword());
                            setTouched((p) => ({ ...p, password: true }));
                          }}
                        >
                          Generate
                        </button>
                      </div>
                      {passwordErr ? <div className="fieldError">{passwordErr}</div> : null}
                    </label>

                    <label className="label">
                      Confirm Password
                      <input
                        className={`input ${confirmErr ? "inputError" : ""}`}
                        value={appConfirm}
                        onChange={(e) => setAppConfirm(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                        placeholder="Re-enter password"
                      />
                      {confirmErr ? <div className="fieldError">{confirmErr}</div> : null}
                    </label>
                  </div>

                  <div className="createFooter">
                    <div className="createNote">
                      Share credentials securely. Password reset/forced change can be added later.
                    </div>

                    <div className="createActions">
                      <button className="navButton" type="button" onClick={goToList} disabled={creating}>
                        Cancel
                      </button>
                      <button
                        className={`navButton primary ${!canCreate || creating ? "disabled" : ""}`}
                        type="submit"
                        disabled={!canCreate || creating}
                      >
                        {creating ? "Creating…" : "Create Applicant"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {!isAdmin ? (
                <div className="statusBanner error">
                  <div className="statusBannerTitle">Not authorized</div>
                  <div className="statusBannerText">Admin access is required to create applicants.</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
