import { useSalon } from "../context/SalonContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useState } from "react";

export function useReservations() {
  const { salon, setSalon } = useSalon();
  const [notification, setNotification] = useState(null);

  const freeTerm = async (datum, term) => {
    const docRef = doc(db, "saloni", salon.id, "raspored", datum);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const updatedTerms = (data.zauzeti_termini || []).filter(
        (t) => !(t.od === term.od && t.do === term.do && t.rezervirao === term.rezervirao)
      );

      await updateDoc(docRef, { zauzeti_termini: updatedTerms });

      setSalon((prev) => {
        const newRaspored = { ...prev.raspored };
        newRaspored[datum].zauzeti_termini = updatedTerms;
        return { ...prev, raspored: newRaspored };
      });

      setNotification({ type: "success", message: `Termin ${term.od}-${term.do} je sada slobodan! ✅` });
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Došlo je do greške pri oslobađanju termina ❌" });
    }
  };

  const cancelReservation = async (salonId, rezervirao, odTime, doTime, datum) => {
    try {
      const response = await fetch("http://localhost:8000/cancel_reservation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, rezervirao, od: odTime, do: doTime, datum }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ type: "success", message: `Termin od ${odTime} do ${doTime} je uspješno otkazan! ✅` });
      } else {
        setNotification({ type: "error", message: `Greška pri otkazivanju: ${data.error || "Nepoznata greška"} ❌` });
      }
      return data.success;
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Došlo je do pogreške prilikom slanja zahtjeva ❌" });
      return false;
    }
  };

  return { freeTerm, cancelReservation, notification, setNotification };
}
