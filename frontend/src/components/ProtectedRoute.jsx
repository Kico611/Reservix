// ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, children }) {
  // Ako Firebase još učitava ili user nije loginan, preusmjeri na login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Ako je loginan, renderaj children
  return children;
}
