import { BrowserRouter, Routes, Route } from "react-router-dom";
import RepositoryUploadPage from "./pages/Repositry_Upload";
import Profile from "./pages/profile";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default page */}
        <Route path="/Repositry_Upload" element={<RepositoryUploadPage />} />
        {/* Profile page */}
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;