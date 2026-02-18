import api from "./axios";

export const getMyModules = () => api.get("/my-modules");
