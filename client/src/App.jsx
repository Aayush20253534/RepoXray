import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar";
import RepositoryUploadPage from "./pages/Repositry_Upload";
import LoginPage from "./pages/login";

function App() {
  const isAuthenticated = localStorage.getItem("user");

  return (
    <BrowserRouter>
      <Routes>

        {/* 🔐 Default → Login */}
        <Route path="/" element={<LoginPage />} />

        {/* 🔐 Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* 🔐 Protected App */}
        <Route
          path="/Repositry_Upload"
          element={
            isAuthenticated ? (
              <>
                <Sidebar />
                <div style={{ marginLeft: "var(--sidebar-width, 220px)" }}>
                  <RepositoryUploadPage />
                </div>
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* 🔁 Catch all */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;