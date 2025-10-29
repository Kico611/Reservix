import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export default function TermModal({
  selectedTerm,
  salon,
  onClose,
  onCancel,
  onFree,
  canBookInterval,
  weekSchedule,
  dayTimes,
  setNotification
}) {
  if (!selectedTerm) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {selectedTerm.isBooked ? (
          <div>
            <h3>Termin zauzet</h3>
            <p>Broj telefona: {selectedTerm.term?.rezervirao || "Nepoznat"}</p>
            <p>Vrijeme: {selectedTerm.term?.od} - {selectedTerm.term?.do}</p>
            <p>Datum: {formatDate(selectedTerm.term.datum)}</p>
            <p>
              Usluga:{" "}
              {salon?.usluge?.find((u) => u.id === selectedTerm.term?.usluga_id)?.naziv || "Nepoznato"}
            </p>
            <button
              className="cancel-reservation-btn"
              onClick={() => selectedTerm?.term?.rezervirao && onCancel(selectedTerm.term)}
            >
              Otkaži termin
            </button>
            <button onClick={() => onFree(selectedTerm)}>Oslobodi termin</button>
            <button onClick={onClose}>Zatvori</button>
          </div>
        ) : (
          <ReservationForm
            selectedTerm={selectedTerm}
            salon={salon}
            onClose={onClose}
            canBookInterval={canBookInterval}
            weekSchedule={weekSchedule}
            dayTimes={dayTimes}
            setNotification={setNotification}
          />
        )}
      </div>
    </div>
  );
}

function ReservationForm({
  selectedTerm,
  salon,
  onClose,
  canBookInterval,
  weekSchedule,
  dayTimes,
  setNotification
}) {
  const [termData, setTermData] = useState(selectedTerm);

  const handleReserve = async () => {
    if (!termData.usluga_id) {
      setNotification({ type: "error", message: "Molimo odaberite uslugu prije rezervacije! ❌" });
      return;
    }

    const usluga = salon.usluge.find(u => u.id === termData.usluga_id);
    if (!usluga) return;

    const duration = usluga.trajanje;

    // Provjera da termin nije u prošlosti
    const now = new Date();
    const termDate = new Date(termData.datum);
    const [hours, minutes] = termData.time.split(":").map(Number);
    termDate.setHours(hours, minutes, 0, 0);
    if (termDate < now) {
      setNotification({ type: "error", message: "Ne možete rezervirati termin u prošlosti ❌" });
      return;
    }

    // Provjera dostupnosti termina
    if (!canBookInterval(weekSchedule, dayTimes, termData.day, termData.time, duration)) {
      setNotification({
        type: "error",
        message: `Termin ne može biti rezerviran jer nema dovoljno slobodnog vremena za uslugu ${usluga.naziv}. ❌`
      });
      return;
    }

    const calculateEndTime = (start, duration) => {
      const [hours, minutes] = start.split(":").map(Number);
      const end = new Date(0, 0, 0, hours, minutes + duration);
      const h = end.getHours().toString().padStart(2, "0");
      const m = end.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    const kraj = calculateEndTime(termData.time, duration);
    const term = {
      od: termData.time,
      do: kraj,
      rezervirao: termData.broj || "",
      usluga_id: termData.usluga_id,
      status: "rezerviran"
    };

    try {
      const docRef = doc(db, "saloni", salon.id, "raspored", termData.datum);
      await updateDoc(docRef, { zauzeti_termini: arrayUnion(term) });

      setNotification({ type: "success", message: `Termin u ${termData.time} uspješno rezerviran! ✅` });
      onClose();
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Došlo je do greške prilikom spremanja termina. ❌" });
    }
  };

  return (
    <div className="reservation-form">
      <h3>Rezerviraj termin</h3>
      <div className="form-group">
        <label>Usluga:</label>
        <select
          value={termData.usluga_id || ""}
          onChange={e => setTermData(prev => ({ ...prev, usluga_id: e.target.value }))}
        >
          <option value="">-- Odaberi uslugu --</option>
          {salon?.usluge?.map(u => (
            <option key={u.id} value={u.id}>{u.naziv} ({u.trajanje} min)</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Vrijeme:</label>
        <input type="text" value={termData.time} disabled />
      </div>
      <div className="form-group">
        <label>Broj telefona ili ime (nije obavezno):</label>
        <input
          type="text"
          placeholder="+387 63 123 456"
          value={termData.broj || ""}
          onChange={e => setTermData(prev => ({ ...prev, broj: e.target.value }))}
        />
      </div>
      <div className="form-actions">
        <button onClick={handleReserve}>Rezerviraj</button>
        <button onClick={onClose}>Zatvori</button>
      </div>
    </div>
  );
}
