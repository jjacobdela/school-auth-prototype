import api from "./axios";


export const requestTraining = (data) => 
  api.post("/training-requests", data);

/* =========================
   CREATE TRAINING REQUEST
========================= */

/* =========================
   ADMIN: Get all requests
========================= */
export const getAllTrainingRequests = () =>
  api.get("/training-requests");

/* =========================
   USER: Get my requests
========================= */
export const getMyTrainingRequests = () =>
  api.get("/training-requests/mine");

/* =========================
   ADMIN: Approve / Reject
========================= */
export const updateTrainingRequest = (id, status) =>
  api.put(`/training-requests/${id}`, { status });
