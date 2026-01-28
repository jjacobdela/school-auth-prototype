import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";

// 🔹 Example API calls (adjust to your backend)
import { getModules, requestTraining } from "../api/training";

export default function RequestTraining() {
    const navigate = useNavigate();

    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        moduleId: "",
        name: "",
        email: "",
        contact: "",
        company: "",
    });

    useEffect(() => {
        async function loadModules() {
            try {
                const data = await getModules(); // from modules dashboard
                setModules(data.modules);
            } catch {
                setError("Failed to load modules");
            } finally {
                setLoading(false);
            }
        }

        loadModules();
    }, []);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        try {
            await requestTraining(form);
            navigate("/dashboard");
        } catch (err) {
            setError(err.message || "Failed to submit request");
        }
    }

    return (
        <div className="page">
            <div className="card">
                <h1 className="title">Request for Training</h1>
                <p className="subtitle">
                    Fill out the form to request a training module.
                </p>

                {loading && <p>Loading modules...</p>}
                {error && <div className="error">{error}</div>}

                {!loading && (
                    <form className="form" onSubmit={handleSubmit}>
                        {/* Module */}
                        <label className="label">
                            Module
                            <select
                                className="input"
                                name="moduleId"
                                value={form.moduleId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a module</option>
                                {modules.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.title}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {/* Name */}
                        <label className="label">
                            Full Name
                            <input
                                className="input"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Juan Dela Cruz"
                                required
                            />
                        </label>

                        {/* Email */}
                        <label className="label">
                            Email
                            <input
                                className="input"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@company.com"
                                required
                            />
                        </label>

                        {/* Contact */}
                        <label className="label">
                            Contact Details
                            <input
                                className="input"
                                name="contact"
                                value={form.contact}
                                onChange={handleChange}
                                placeholder="+63 9XX XXX XXXX"
                                required
                            />
                        </label>

                        {/* Company */}
                        <label className="label">
                            Company
                            <input
                                className="input"
                                name="company"
                                value={form.company}
                                onChange={handleChange}
                                placeholder="Company Name"
                                required
                            />
                        </label>

                        <button className="button" type="submit">
                            Submit Request
                        </button>

                        <button
                            type="button"
                            className="button secondary"
                            onClick={() => navigate("/dashboard")}
                        >
                            Cancel
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
