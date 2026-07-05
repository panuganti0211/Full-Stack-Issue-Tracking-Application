import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import DueDateAlertProvider from "./components/providers/DueDateAlertProvider";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <WorkspaceProvider>
        <DueDateAlertProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "text-sm",
              style: { background: "#fff", color: "#1e293b" },
            }}
          />
          <App />
        </DueDateAlertProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </React.StrictMode>
);
