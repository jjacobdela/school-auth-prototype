const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

function getTokenFromStorage() {
  const candidates = ["token", "authToken", "accessToken", "jwt", "login_token"];
  for (const key of candidates) {
    const v = localStorage.getItem(key);
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

async function parseError(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (data && data.message) return data.message;
  return `Request failed (${res.status})`;
}

async function request(path, options = {}) {
  const token = getTokenFromStorage();
  if (!token) throw new Error("Missing auth token. Please log in again.");

  const url = `${API_BASE}${path}`;

  // Try Bearer first
  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  // If backend expects raw token, retry once
  if (res.status === 401 || res.status === 403) {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token
      }
    });
  }

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createExam(payload) {
  return request("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function listPublishedExams() {
  return request("/api/exams?status=published", {
    method: "GET"
  });
}

export async function getExamById(id) {
  return request(`/api/exams/${id}`, { method: "GET" });
}

export async function updateExamById(id, payload) {
  return request(`/api/exams/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function deleteExamById(id) {
  return request(`/api/exams/${id}`, {
    method: "DELETE"
  });
}
