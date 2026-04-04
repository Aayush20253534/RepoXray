import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar";
import RepositoryUploadPage from "./pages/Repositry_Upload";
import LoginPage from "./pages/login";

function App() {
  const isAuthenticated = localStorage.getItem("user");

  return (
    <BrowserRouter>
      {!isAuthenticated ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <div className="flex min-h-screen bg-[#030306] text-white">

          {/* Sidebar */}
          <Sidebar />

          {/* Main */}
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/Repositry_Upload" />} />
              <Route
  path="/Repositry_Upload"
  element={<RepositoryUploadPage key={window.location.pathname + Date.now()} />}
/>
            </Routes>
          </div>

        </div>
      )}
    </BrowserRouter>
  );
}

export default App;