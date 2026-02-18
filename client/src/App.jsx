import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExamCreation from "./pages/ExamCreation";
import ProtectedRoute from "./components/ProtectedRoute";
import RequestTraining from "./pages/RequestTraining";
import CreateModule from "./pages/CreateModule";
import UploadModuleContent from "./pages/UploadModuleContent";
import MyTraining from "./pages/MyTraining";
import ModuleBuilder from "./pages/ModuleBuilder";
import ModulesList from "./pages/ModuleList";
import ModuleView from "./pages/ModuleView";



export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Training */}
      <Route
        path="/request-training"
        element={
          <ProtectedRoute>
            <RequestTraining />
          </ProtectedRoute>
        }
      />

      
<Route
  path="/modules/builder"
  element={
    <ProtectedRoute>
      <ModuleBuilder />
    </ProtectedRoute>
  }
/>
      <Route
        path="/my-training"
        element={
          <ProtectedRoute>
            <MyTraining />
          </ProtectedRoute>
        }
      />

      {/* Module Creation */}
      <Route
        path="/modules/create"
        element={
          <ProtectedRoute>
            <CreateModule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modules/:id/upload"
        element={
          <ProtectedRoute>
            <UploadModuleContent />
          </ProtectedRoute>
        }
      />

      {/* Existing Feature */}
      <Route
        path="/exam-creation"
        element={
          <ProtectedRoute>
            <ExamCreation />
          </ProtectedRoute>
        }
      />

  
     {/* Modules */}
<Route
  path="/modules"
  element={
    <ProtectedRoute>
      <ModulesList />
    </ProtectedRoute>
  }
/>

<Route
  path="/modules/new"
  element={
    <ProtectedRoute>
      <ModuleBuilder />
    </ProtectedRoute>
  }
/>

<Route
  path="/modules/:id/edit"
  element={
    <ProtectedRoute>
      <ModuleBuilder />
    </ProtectedRoute>
  }
/>

<Route
  path="/modules/:id/view"
  element={
    <ProtectedRoute>
      <ModuleView />
    </ProtectedRoute>
  }
/>


      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
