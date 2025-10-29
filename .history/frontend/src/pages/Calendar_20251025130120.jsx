import React, { useState } from "react";
import WeekNavigator from "../components/WeekNavigator";
import { days, getWeekRange } from "../utils/dateUtils";
import { useSalon } from "../context/SalonContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Notification from "../components/Notification";
import "../styles/Calendar.css";

export default function Calendar() {
  const { salon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    pocetak_rada: "",
    kraj_rada: "",
    pauze: [{ od: "", do: "" }],
  });
  const [lastEntered, setLastEntered] = useState({
    pocetak_rada: "",
    kraj_rada: "",
    pauze: [{ od: "", do: "" }],
  });
  const [notification, setNotification] = useState(null);

  const prevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(weekStart.getDate() - 7);
    setWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(weekStart.getDate() + 7);
    setWeekStart(newDate);
  };

  const formatSelectedDate = (dateStr) => {
    const date = new Date(dateStr);
    const dayNames = [
      "Ponedjeljak",
      "Utorak",
      "Srijeda",
      "Četvrtak",
      "Petak",
      "Subota",
      "Nedjelja",
    ];
    const dayName = dayNames[(date.getDay() + 6) % 7];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ${day}.${month}.${year}`;
  };

  if (loading) return <div>Učitavanje...</div>;
  if (!salon) return <div>Salon nije pronađen.</div>;

  const { monday, label } = getWeekRange(weekStart);

  // Filtriramo raspored samo za ovaj tjedan
  const weekData = {};
  if (salon?.raspored) {
    Object.entries(salon.raspored).forEach(([datum, data]) => {
      const dateObj = new Date(datum);
      if (dateObj >= monday && dateObj < new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        const dayName = days[(dateObj.getDay() + 6) % 7];
        weekData[dayName] = {
          date: datum,
          start: data.pocetak_rada,
          end: data.kraj_rada,
          pauze: data.pauze || [],
        };
      }
    });
  }

  const handleDayClick = (day) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + days.indexOf(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      setNotification({ type: "error", message: "Ne možete postaviti raspored za prošli dan." });
      return;
    }

    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setSelectedDate(isoDate);

    const dayData = weekData[day];
    if (dayData) {
      setFormData({
        pocetak_rada: dayData.start || "",
        kraj_rada: dayData.end || "",
        pauze:
          dayData.pauze.length > 0
            ? dayData.pauze
            : lastEntered.pauze.length > 0
            ? lastEntered.pauze
            : [{ od: "", do: "" }],
      });
    } else {
      setFormData({
        pocetak_rada: lastEntered.pocetak_rada,
        kraj_rada: lastEntered.kraj_rada,
        pauze: lastEntered.pauze.length > 0 ? lastEntered.pauze : [{ od: "", do: "" }],
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePauzaChange = (index, field, value) => {
    const newPauze = [...formData.pauze];
    newPauze[index][field] = value;
    setFormData((prev) => ({ ...prev, pauze: newPauze }));
  };

  const addPauza = () => {
    setFormData((prev) => ({
      ...prev,
      pauze: [...prev.pauze, { od: "", do: "" }],
    }));
  };

  // Pretvaranje vremena u minute za pravilnu usporedbu
  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const saveRaspored = async () => {
  if (!selectedDate) return;

  const validPauze = formData.pauze.filter((p) => p.od.trim() !== "" && p.do.trim() !== "");
  const existingAppointments = salon?.raspored?.[selectedDate]?.zauzeti_termini || [];

  const startMin = timeToMinutes(formData.pocetak_rada);
  const endMin = timeToMinutes(formData.kraj_rada);

  console.log("=== SAVE RASPORED DEBUG ===");
  console.log("Selected date:", selectedDate);
  console.log("Form data:", formData);
  console.log("Valid pauze:", validPauze);
  console.log("Existing appointments:", existingAppointments);
  console.log("Radno vrijeme u minutama:", { startMin, endMin });

  const checkCollision = (newStart, newEnd, newPauze, appointments) => {
    for (let appt of appointments) {
      const apptStart = timeToMinutes(appt.od);
      const apptEnd = timeToMinutes(appt.do);

      console.log("  Checking appointment:", appt.od, "-", appt.do, { apptStart, apptEnd, newStart, newEnd });

      if (apptStart < newStart || apptEnd > newEnd) {
        console.log("    Conflict with working hours detected!");
        return `Termin ${appt.od} - ${appt.do} nije unutar novog radnog vremena.`;
      }

      for (let p of newPauze) {
        const pauzaStart = timeToMinutes(p.od);
        const pauzaEnd = timeToMinutes(p.do);
        console.log("    Checking pauza:", p.od, "-", p.do, { pauzaStart, pauzaEnd });
        if (!(apptEnd <= pauzaStart || apptStart >= pauzaEnd)) {
          console.log("    Conflict with pauza detected!");
          return `Termin ${appt.od} - ${appt.do} poklapa se s pauzom ${p.od} - ${p.do}.`;
        }
      }
    }
    return null;
  };

  const conflictMessage = checkCollision(startMin, endMin, validPauze, existingAppointments);
  if (conflictMessage) {
    console.log("=== CONFLICT FOUND ===", conflictMessage);
    setNotification({ type: "error", message: conflictMessage });
    return;
  }

  console.log("No conflicts, saving schedule...");

  // Spremanje rasporeda
  const rasporedRef = doc(db, "saloni", salon.id, "raspored", selectedDate);
  await setDoc(rasporedRef, {
    ...formData,
    pauze: validPauze,
  });

  setLastEntered({
    pocetak_rada: formData.pocetak_rada,
    kraj_rada: formData.kraj_rada,
    pauze: validPauze.length > 0 ? validPauze : [{ od: "", do: "" }],
  });

  setNotification({ type: "success", message: "Raspored uspješno spremljen!" });
  setSelectedDate(null);
  setFormData({
    pocetak_rada: "",
    kraj_rada: "",
    pauze: [{ od: "", do: "" }],
  });
};


  return (
    <div className="calendar">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} monday={monday} />

      <table>
        <thead>
          <tr>
            <th>Dan</th>
            <th>Radno vrijeme</th>
            <th>Pauze</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dayData = weekData[day];
            return (
              <tr key={day} onClick={() => handleDayClick(day)} style={{ cursor: "pointer" }}>
                <td>{day}</td>
                <td>{dayData ? `${dayData.start} - ${dayData.end}` : "Nije postavljeno"}</td>
                <td>
                  {dayData && dayData.pauze.length > 0
                    ? dayData.pauze.map((p, i) => <div key={i}>{p.od} - {p.do}</div>)
                    : "Nema pauza"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedDate && (
        <div className="modal">
          <div className="modal-content">
            <h3>
              Postavi radno vrijeme za <br />
              {formatSelectedDate(selectedDate)}
            </h3>

            <label>Početak rada:</label>
            <input type="time" name="pocetak_rada" value={formData.pocetak_rada} onChange={handleChange} />

            <label>Kraj rada:</label>
            <input type="time" name="kraj_rada" value={formData.kraj_rada} onChange={handleChange} />

            <h4>Pauze</h4>
            {formData.pauze.map((pauza, i) => (
              <div key={i} className="pauza-group">
                <input type="time" value={pauza.od} onChange={(e) => handlePauzaChange(i, "od", e.target.value)} />
                <input type="time" value={pauza.do} onChange={(e) => handlePauzaChange(i, "do", e.target.value)} />
              </div>
            ))}
            <button onClick={addPauza}>+ Dodaj pauzu</button>

            <div className="modal-actions">
              <button onClick={saveRaspored}>Spremi</button>
              <button onClick={() => setSelectedDate(null)}>Zatvori</button>
            </div>
          </div>
        </div>
      )}

      <Notification notification={notification} setNotification={setNotification} />
    </div>
  );
}
