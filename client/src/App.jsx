import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RepositoryUploadPage from "./pages/Repositry_Upload";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/Repositry_Upload" replace />} />
        <Route path="/Repositry_Upload" element={<RepositoryUploadPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;