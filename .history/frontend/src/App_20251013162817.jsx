// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import ProtectedRoute from "./components/ProtectedRoute";
import { SalonProvider } from "./context/SalonContext";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import BottomNav from "./components/BottomNav";

import "../src/styles/App.css";

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>; // loader dok se auth učitava

  const showBottomNav = user && location.pathname !== "/login";

  return (
    <>
      <main className="content">
        <Routes>
          {/* Login ruta */}
          <Route path="/login" element={<Login setUser={setUser} />} />

          {/* Protected rute */}
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Home user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/raspored"
            element={
              <ProtectedRoute user={user}>
                <Calendar user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/postavke"
            element={
              <ProtectedRoute user={user}>
                <Settings user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <ProtectedRoute user={user}>
                <Profile user={user} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {showBottomNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <SalonProvider>
        <div className="app">
          <AppContent />
        </div>
      </SalonProvider>
    </Router>
  );
}
