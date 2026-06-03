import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/sidebar";
import RepositoryUploadPage from "./pages/Repositry_Upload";
import LoginPage from "./pages/login";

function App() {
  const token = localStorage.getItem("token");

  return (
    <BrowserRouter>
      {!token ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <div className="flex min-h-screen bg-[#030306] text-white">
          <Sidebar />

          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/Repositry_Upload" replace />} />
              <Route
                path="/Repositry_Upload"
                element={<RepositoryUploadPage />}
              />
              <Route path="*" element={<Navigate to="/Repositry_Upload" replace />} />
            </Routes>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;