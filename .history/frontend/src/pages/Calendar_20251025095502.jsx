import React, { useState } from "react";
import WeekNavigator from "../components/WeekNavigator";
import { days, getWeekRange } from "../utils/dateUtils";
import { useSalon } from "../context/SalonContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
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

  // Zadnje unesene vrijednosti
  const [lastEnteredData, setLastEnteredData] = useState({
    pocetak_rada: "",
    kraj_rada: "",
    pauze: [{ od: "", do: "" }],
  });

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
    const dayNames = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];
    const dayName = dayNames[(date.getDay() + 6) % 7];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ${day}.${month}.${year}`;
  };

  if (loading) return <div>Učitavanje...</div>;
  if (!salon) return <div>Salon nije pronađen.</div>;

  const { monday, sunday, label } = getWeekRange(weekStart);

  // Priprema podataka za tjedan
  const weekData = {};
  if (salon?.raspored) {
    Object.entries(salon.raspored).forEach(([datum, data]) => {
      const dateStr = datum;
      const dateObj = new Date(dateStr);
      const dayName = days[(dateObj.getDay() + 6) % 7];
      weekData[dayName] = {
        date: dateStr,
        start: data.pocetak_rada,
        end: data.kraj_rada,
        pauze: data.pauze || [],
      };
    });
  }

  const handleDayClick = (day) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + days.indexOf(day));
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setSelectedDate(isoDate);

    const dayData = weekData[day];
    if (dayData) {
      setFormData({
        pocetak_rada: dayData.start || "",
        kraj_rada: dayData.end || "",
        pauze: dayData.pauze.length > 0 ? dayData.pauze : [{ od: "", do: "" }],
      });
    } else {
      // Popuni formu zadnjim unesnim vrijednostima
      setFormData({ ...lastEnteredData });
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

  const checkCollision = (newStart, newEnd, newPauze, existingAppointments) => {
    for (let appt of existingAppointments) {
      const apptStart = appt.start;
      const apptEnd = appt.end;

      if (apptStart < newStart || apptEnd > newEnd) return true;

      for (let p of newPauze) {
        if (!(apptEnd <= p.od || apptStart >= p.do)) return true;
      }
    }
    return false;
  };

  const saveRaspored = async () => {
    if (!selectedDate) return;

    const validPauze = formData.pauze.filter((p) => p.od.trim() !== "" && p.do.trim() !== "");
    const existingAppointments = salon?.termini?.[selectedDate] || [];

    if (checkCollision(formData.pocetak_rada, formData.kraj_rada, validPauze, existingAppointments)) {
      alert("Postoji termin koji se poklapa s novim radnim vremenom ili pauzom. Prvo otkažite termin.");
      return;
    }

    const rasporedRef = doc(db, "saloni", salon.id, "raspored", selectedDate);
    await setDoc(rasporedRef, { ...formData, pauze: validPauze });

    // Spremi zadnje unesene vrijednosti
    setLastEnteredData({ ...formData });

    setSelectedDate(null);
    setFormData({ pocetak_rada: "", kraj_rada: "", pauze: [{ od: "", do: "" }] });
  };

  return (
    <div className="calendar">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} />

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
                    ? dayData.pauze.map((p, i) => (
                        <div key={i}>
                          {p.od} - {p.do}
                        </div>
                      ))
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
                <input
                  type="time"
                  value={pauza.od}
                  onChange={(e) => handlePauzaChange(i, "od", e.target.value)}
                  placeholder="Početak pauze"
                />
                <input
                  type="time"
                  value={pauza.do}
                  onChange={(e) => handlePauzaChange(i, "do", e.target.value)}
                  placeholder="Kraj pauze"
                />
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
    </div>
  );
}
