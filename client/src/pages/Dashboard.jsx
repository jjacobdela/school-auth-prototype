import React, { useEffect, useState } from "react";
import { clearToken, me } from "../api/auth";
import { useNavigate } from "react-router-dom";
import "../styles/form.css";
import "../styles/dashboard.css";

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const data = await me();
                if (mounted) setUser(data.user);
            } catch (err) {
                if (mounted) setError(err.message || "Not authenticated");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    function logout() {
        clearToken();
        navigate("/login");
    }

    return (
        <div className="dashboardPage">
            {/* Top Navigation */}
            <header className="dashboardHeader">
                <button
                    className="navButton"
                    onClick={() => navigate("/request-training")}
                >
                    Request Training Module
                </button>

                <button
                    className="navButton"
                    onClick={() => navigate("/module-creation")}
                >
                    Module Creation
                </button>

                <button
                    className="navButton"
                    onClick={() => navigate("/exam-creation")}
                >
                    Exam Creation
                </button>

                <button
                    className="navButton"
                    onClick={() => navigate("/user-management")}
                >
                    User Management
                </button>

                <button
                    className="navButton"
                    onClick={() => navigate("/account-management")}
                >
                    Account Management
                </button>
            </header>

            {/* Main Card Content */}
            <div className="page">
                <div className="card">
                    <h1 className="title">Dashboard</h1>
                    <p className="subtitle">Protected page (requires login).</p>

                    {loading && <p>Loading...</p>}

                    {!loading && error && <div className="error">{error}</div>}

                    {!loading && user && (
                        <div className="profileBox">
                            <div>
                                <strong>Name:</strong> {user.fullName}
                            </div>
                            <div>
                                <strong>Email:</strong> {user.email}
                            </div>
                            <div>
                                <strong>Created:</strong>{" "}
                                {new Date(user.createdAt).toLocaleString()}
                            </div>
                        </div>
                    )}

                    <button className="button secondary" onClick={logout}>
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}
