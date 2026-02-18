import { useState } from "react";
import { createModule } from "../api/modules";
import UploadModuleContent from "./UploadModuleContent";
import "../styles/createModule.css";

export default function CreateModule() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [moduleId, setModuleId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;

    const res = await createModule(form);
    setModuleId(res.data._id); // 👈 important
  };

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Create Module</h2>
        <p className="subtitle">Create a module and upload its content</p>

        <form className="form" onSubmit={submit}>
          <label className="label">
            Title
            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />
          </label>

          <label className="label">
            Description
            <textarea
              className="input"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>

          <button
            className="button"
            disabled={!form.title || !form.description}
          >
            Create Module
          </button>
        </form>

        {/* 👇 UPLOAD APPEARS ONLY AFTER CREATE */}
        {moduleId && (
          <>
            <hr className="divider" />
            <UploadModuleContent moduleId={moduleId} />
          </>
        )}
      </div>
    </div>
  );
}
