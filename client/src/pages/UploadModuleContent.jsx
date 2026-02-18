import { useState } from "react";
import {
  uploadFileContent,
  createTextContent
} from "../api/moduleContent";

export default function UploadModuleContent({ moduleId }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState("pdf");
  const [text, setText] = useState("");

  if (!moduleId) return null;

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleId", moduleId);
    formData.append("type", type);

    await uploadFileContent(formData);
    alert("File uploaded");
  };

  const uploadText = async () => {
    await createTextContent({
      moduleId,
      title: "Lesson",
      textContent: text
    });
    alert("Text saved");
  };

  return (
    <>
      <h3>Upload Content</h3>

      <label className="label">
        Content Type
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="slides">Slides</option>
          <option value="image">Image</option>
        </select>
      </label>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button className="button" onClick={uploadFile} disabled={!file}>
        Upload File
      </button>

      <hr />

      <textarea
        className="input"
        rows={4}
        placeholder="Text lesson"
        onChange={(e) => setText(e.target.value)}
      />
      <button className="button secondary" onClick={uploadText}>
        Save Text
      </button>
    </>
  );
}
