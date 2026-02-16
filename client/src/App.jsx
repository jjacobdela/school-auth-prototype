import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExamCreation from "./pages/ExamCreation";
import AccountManagement from "./pages/AccountManagement";
import UserManagement from "./pages/UserManagement";
import RoleRoute from "./components/RoleRoute";
import ApplicantDashboard from "./pages/ApplicantDashboard";
import ApplicantModules from "./pages/ApplicantModules";
import ApplicantExam from "./pages/ApplicantExam";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Shared: any authenticated user can enter /dashboard,
          but Dashboard will redirect based on role */}
      <Route
        path="/dashboard"
        element={
          <RoleRoute roles={["admin", "applicant"]}>
            <Dashboard />
          </RoleRoute>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/exam-creation"
        element={
          <RoleRoute roles={["admin"]}>
            <ExamCreation />
          </RoleRoute>
        }
      />

      <Route
        path="/user-management"
        element={
          <RoleRoute roles={["admin"]}>
            <UserManagement />
          </RoleRoute>
        }
      />

      {/* Shared authenticated route */}
      <Route
        path="/account-management"
        element={
          <RoleRoute roles={["admin", "applicant"]}>
            <AccountManagement />
          </RoleRoute>
        }
      />

      {/* Applicant-only routes */}
      <Route
        path="/applicant-dashboard"
        element={
          <RoleRoute roles={["applicant"]}>
            <ApplicantDashboard />
          </RoleRoute>
        }
      />

      <Route
        path="/modules"
        element={
          <RoleRoute roles={["applicant"]}>
            <ApplicantModules />
          </RoleRoute>
        }
      />

      <Route
        path="/exam"
        element={
          <RoleRoute roles={["applicant"]}>
            <ApplicantExam />
          </RoleRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
