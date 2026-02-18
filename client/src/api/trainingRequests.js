import api from "./axios";

export const requestTraining = (data) =>
  api.post("/training-requests", data);

export const getMyRequests = () =>
  api.get("/training-requests");
