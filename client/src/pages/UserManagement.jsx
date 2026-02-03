import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/themes.css";
import "../styles/userManagement.css";
import { me } from "../api/auth";

function getToken() {
  return localStorage.getItem("token");
}

async function apiGet(url) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

async function apiPost(url, body) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
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

const MOCK_USERS = [
  {
    id: "u_admin",
    fullName: "Admin User",
    email: "admin@gmail.com",
    role: "admin",
    status: "Active",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2
  },
  {
    id: "u_app_1",
    fullName: "Applicant One",
    email: "applicant1@example.com",
    role: "applicant",
    status: "Active",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1
  },
  {
    id: "u_app_2",
    fullName: "Applicant Two",
    email: "applicant2@example.com",
    role: "applicant",
    status: "Disabled",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6
  }
];

export default function UserManagement() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState("corporate");

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

  const [users, setUsers] = useState([]);
  const [dataMode, setDataMode] = useState("mock"); // mock | api

  const [viewMode, setViewMode] = useState("list"); // list | create

  const [search, setSearch] = useState("");
  const [showAllRoles, setShowAllRoles] = useState(false);
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
    return (viewer?.email || "").toLowerCase() === "admin@gmail.com";
  }, [viewer]);

  async function loadUsers() {
    setUiMessage({ type: "", title: "", text: "" });
    setLoading(true);

    try {
      if (dataMode === "mock") {
        setUsers(MOCK_USERS);
        setUiMessage({
          type: "info",
          title: "Mock data",
          text: "This page is using mock data. Switch to API mode once backend endpoints are ready."
        });
        return;
      }

      const base = "http://localhost:5001";
      const data = await apiGet(`${base}/api/users`);
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
        text:
          err.message ||
          "Failed to load users. If endpoints are not ready, switch to Mock mode."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadUsers();
      if (!mounted) return;
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...users];

    if (!showAllRoles) {
      list = list.filter((u) => (u.role || "") === "applicant");
    }

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
  }, [users, search, showAllRoles, statusFilter, sort]);

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

  function uiToggleDisable(u) {
    const nextStatus = (u.status || "Active") === "Disabled" ? "Active" : "Disabled";

    setUsers((prev) =>
      prev.map((x) => {
        const match = (x._id || x.id) === (u._id || u.id);
        if (!match) return x;
        return { ...x, status: nextStatus, updatedAt: Date.now() };
      })
    );

    setUiMessage({
      type: "success",
      title: "User updated",
      text: `User status updated (UI-only): ${u.fullName} is now ${nextStatus}.`
    });

    setSelectedUser((prev) => {
      if (!prev) return prev;
      const match = (prev._id || prev.id) === (u._id || u.id);
      if (!match) return prev;
      return { ...prev, status: nextStatus, updatedAt: Date.now() };
    });
  }

  function uiDeleteUser(u) {
    const ok = window.confirm(`Delete ${u.fullName}? This is UI-only right now.`);
    if (!ok) return;

    setUsers((prev) => prev.filter((x) => (x._id || x.id) !== (u._id || u.id)));
    setUiMessage({ type: "success", title: "User deleted", text: `User deleted (UI-only): ${u.fullName}` });

    setSelectedUser((prev) => {
      if (!prev) return prev;
      const match = (prev._id || prev.id) === (u._id || u.id);
      return match ? null : prev;
    });
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
        text: "Only admin@gmail.com can create applicant accounts."
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
        text: "Only admin@gmail.com can create applicant accounts."
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
      if (dataMode === "mock") {
        const now = Date.now();
        const next = {
          id: crypto.randomUUID(),
          fullName: appFullName.trim(),
          email: appEmail.trim().toLowerCase(),
          role: "applicant",
          status: "Active",
          createdAt: now,
          updatedAt: now
        };

        setUsers((prev) => [next, ...prev]);

        setUiMessage({
          type: "success",
          title: "Applicant created",
          text: `Applicant account created (UI-only): ${next.email}`
        });

        goToList();
        return;
      }

      const base = "http://localhost:5001";

      const payload = {
        fullName: appFullName.trim(),
        email: appEmail.trim().toLowerCase(),
        password: appPassword,
        role: "applicant"
      };

      await apiPost(`${base}/api/users/applicants`, payload);

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
        text:
          err.message ||
          "Failed to create applicant. If the backend endpoint is not ready, switch to Mock mode."
      });
    } finally {
      setCreating(false);
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
            <div className="brandSubtitle">Admin creates applicant accounts. Applicants use a separate dashboard later.</div>
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
              <button className={`navButton primary ${!isAdmin ? "disabled" : ""}`} type="button" onClick={goToCreateApplicant} disabled={!isAdmin}>
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
              <h1 className="pageTitle">{viewMode === "list" ? "Users" : "Create Applicant"}</h1>
              <p className="pageSubtitle">
                {viewMode === "list"
                  ? "View applicant accounts. Only admin@gmail.com can create applicants."
                  : "Create an applicant account for hiring assessments. Share credentials securely."}
              </p>

              {viewer ? (
                <div className="viewerLine">
                  Signed in as <span className="viewerStrong">{viewer.fullName}</span> ({viewer.email}){" "}
                  <span className={`rolePill ${isAdmin ? "admin" : "applicant"}`}>{isAdmin ? "Admin" : "Applicant"}</span>
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
              <div className="statusBannerText">Only admin@gmail.com can create applicant accounts.</div>
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
              <button
                className={`segBtn ${viewMode === "list" ? "active" : ""}`}
                type="button"
                onClick={goToList}
              >
                Users
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

            <label className="modePill">
              Data
              <select className="modeSelect" value={dataMode} onChange={(e) => setDataMode(e.target.value)}>
                <option value="mock">Mock</option>
                <option value="api">API</option>
              </select>
            </label>
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

                  <label className="checkPill">
                    <input
                      type="checkbox"
                      checked={showAllRoles}
                      onChange={(e) => setShowAllRoles(e.target.checked)}
                    />
                    Show all roles
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
                  <div className="tableEmpty">Loading users…</div>
                ) : filtered.length === 0 ? (
                  <div className="tableEmpty">No users match your filters.</div>
                ) : (
                  <div className="userTableBody">
                    {filtered.map((u) => {
                      const key = u._id || u.id || `${u.email}-${u.fullName}`;
                      const status = u.status || "Active";
                      const role = u.role || "applicant";

                      return (
                        <div className="userRow" key={key}>
                          <div className="cellName">
                            <div className="nameStrong">{u.fullName || "—"}</div>
                          </div>

                          <div className="cellEmail">{u.email || "—"}</div>

                          <div className="cellRole">
                            <span className={`pill ${role === "admin" ? "pillAdmin" : "pillApplicant"}`}>{role}</span>
                          </div>

                          <div className="cellStatus">
                            <span className={`statusPill ${status === "Disabled" ? "disabled" : "active"}`}>
                              {status}
                            </span>
                          </div>

                          <div className="cellCreated">{formatDate(u.createdAt)}</div>

                          <div className="cellActions">
                            <button className="navButton primary" type="button" onClick={() => openUser(u)}>
                              View
                            </button>

                            <button
                              className="navButton"
                              type="button"
                              onClick={() => uiToggleDisable(u)}
                              disabled={role === "admin"}
                              title={role === "admin" ? "Admin cannot be disabled here" : "Toggle status"}
                            >
                              {status === "Disabled" ? "Enable" : "Disable"}
                            </button>

                            <button
                              className="dangerButton"
                              type="button"
                              onClick={() => uiDeleteUser(u)}
                              disabled={role === "admin"}
                              title={role === "admin" ? "Admin cannot be deleted here" : "Delete user"}
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
                      <div className="modalTitle">User Details</div>
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
                          <div className="detailValue">{formatDate(selectedUser.updatedAt || selectedUser.createdAt)}</div>
                        </div>
                      </div>

                      <div className="modalActions">
                        <button
                          className="navButton"
                          type="button"
                          onClick={() => uiToggleDisable(selectedUser)}
                          disabled={(selectedUser.role || "applicant") === "admin"}
                        >
                          {(selectedUser.status || "Active") === "Disabled" ? "Enable User" : "Disable User"}
                        </button>
                        <button
                          className="dangerButton"
                          type="button"
                          onClick={() => uiDeleteUser(selectedUser)}
                          disabled={(selectedUser.role || "applicant") === "admin"}
                        >
                          Delete User
                        </button>
                      </div>

                      <div className="modalNote">
                        Actions here are UI-only for now. When you’re ready, we can wire these to backend endpoints.
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
                  <div className="statusBannerText">Only admin@gmail.com can create applicants.</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
