import api from "./axios";

export const uploadFileContent = (formData) =>
  api.post("/module-content/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

export const createTextContent = (data) =>
  api.post("/module-content/text", data);
