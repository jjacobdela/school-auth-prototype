import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExamCreation from "./pages/ExamCreation";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountManagement from "./pages/AccountManagement";
import UserManagement from "./pages/UserManagement";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/exam-creation"
        element={
          <ProtectedRoute>
            <ExamCreation />
          </ProtectedRoute>
        }
      />

      <Route path="/account-management" element={<AccountManagement />} />

      <Route path="/user-management" element={<UserManagement />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
