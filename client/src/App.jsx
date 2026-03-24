import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExamCreation from "./pages/ExamCreation";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AppShellLayout from "./components/AppShellLayout";

// Admin pages (make sure these imports exist)
import UserManagement from "./pages/UserManagement";
import AccountManagement from "./pages/AccountManagement";

// Applicant pages (make sure these imports exist)
import ApplicantDashboard from "./pages/ApplicantDashboard";
import ApplicantExam from "./pages/ApplicantExam";

// Training + Modules system
import RequestTraining from "./pages/RequestTraining";
import MyTraining from "./pages/MyTraining";
import CreateModule from "./pages/CreateModule";
import UploadModuleContent from "./pages/UploadModuleContent";
import ModuleBuilder from "./pages/ModuleBuilder";
import ModulesList from "./pages/ModuleList";
import ModuleView from "./pages/ModuleView";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        {/* Shared authenticated routes */}
        <Route
          path="/dashboard"
          element={
            <RoleRoute roles={["admin"]}>
              <Dashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/account-management"
          element={
            <RoleRoute roles={["admin", "applicant"]}>
              <AccountManagement />
            </RoleRoute>
          }
        />

        {/* Admin-only */}
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

        {/* Applicant-only */}
        <Route
          path="/applicant-dashboard"
          element={
            <RoleRoute roles={["applicant"]}>
              <ApplicantDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/applicant/modules"
          element={
            <RoleRoute roles={["applicant"]}>
              <ModulesList />
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

        {/* Training (logged in) */}
        <Route path="/request-training" element={<RequestTraining />} />
        <Route path="/my-training" element={<MyTraining />} />

        {/* Modules system (logged in) */}
        <Route path="/modules" element={<ModulesList />} />
        <Route path="/modules/new" element={<ModuleBuilder />} />
        <Route path="/modules/:id/edit" element={<ModuleBuilder />} />
        <Route path="/modules/:id/view" element={<ModuleView />} />

        {/* Legacy/extra module routes you had */}
        <Route path="/modules/create" element={<CreateModule />} />
        <Route path="/modules/:id/upload" element={<UploadModuleContent />} />
        <Route path="/modules/builder" element={<ModuleBuilder />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
