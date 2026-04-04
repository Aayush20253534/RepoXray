import { BrowserRouter, Routes, Route } from "react-router-dom";
import RepositoryUploadPage from "./pages/Repositry_Upload";
import Profile from "./pages/profile";
import History from "./pages/history";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default page */}
        <Route path="/" element={<RepositoryUploadPage />} />

        {/* Profile page */}
        <Route path="/profile" element={<Profile />} />

        {/* History page */}
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;