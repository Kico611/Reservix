import { useSalon } from "../context/SalonContext";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../styles/Profile.css";

export default function Profile() {
  const { user, salon, loading } = useSalon();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading...</p>;

  if (!salon) return <p>Nema dostupnih podataka o salonu</p>;

  return (
    <div className="profile-container">
      <h2>Profil</h2>
      <div className="profile-card">
        <div className="profile-info">
          <p>
            <strong>Naziv:</strong> {salon.naziv}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Kontakt:</strong>{" "}
            {salon.kontakt && salon.kontakt.slice(1, -1)}
          </p>
          <p>
            <strong>Adresa:</strong> {salon.adresa}
          </p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Odjava
        </button>
      </div>
    </div>
  );
}
