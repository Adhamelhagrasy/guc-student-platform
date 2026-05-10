import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import WelcomePage from "./WelcomePage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ProfilePage from "./ProfilePage";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [user, setUser] = useState(null);

  if (user) {
    if (user.role === "Administrator") {
      return (
        <AdminDashboard user={user} onLogout={() => setUser(null)} />
      );
    }

    return (
      <ProfilePage user={user} onLogout={() => setUser(null)} />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;