const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

function getTokenFromStorage() {
  // IMPORTANT: Put your real token key FIRST here once you know it.
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

export async function createExam(payload) {
  const token = getTokenFromStorage();
  if (!token) {
    throw new Error("Missing auth token. Please log in again.");
  }

  // Try Bearer first (most common middleware expectation).
  let res = await fetch(`${API_BASE}/api/exams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  // If backend expects raw token, retry once.
  if (res.status === 401 || res.status === 403) {
    res = await fetch(`${API_BASE}/api/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify(payload)
    });
  }

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
