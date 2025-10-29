import { useState } from "react";
import { useSalon } from "../context/SalonContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useReservations() {
  const { salon, setSalon } = useSalon();
  const [notification, setNotification] = useState(null);

  // Oslobađanje termina
  const freeTerm = async (datum, term, onClose) => {
    if (!salon?.id) {
      setNotification({ type: "error", message: "Greška: salon nije ispravno učitan ❌" });
      return;
    }

    if (!term.rezervirao || term.rezervirao.trim() === "") {
      setNotification({ type: "error", message: "Termin se ne može osloboditi bez imena/broja! ❌" });
      return;
    }

    const datumString = datum instanceof Date ? datum.toISOString().split("T")[0] : String(datum);
    const docRef = doc(db, "saloni", salon.id, "raspored", datumString);

    // Update lokalnog stanja
    const updatedTerms = (salon.raspored?.[datumString]?.zauzeti_termini || []).filter(
      t => !(t.od === term.od && t.do === term.do && t.rezervirao === term.rezervirao)
    );

    try {
      await updateDoc(docRef, { zauzeti_termini: updatedTerms });

      setSalon(prev => {
        const newRaspored = { ...prev.raspored };
        if (newRaspored[datumString]) {
          newRaspored[datumString].zauzeti_termini = updatedTerms;
        }
        return { ...prev, raspored: newRaspored };
      });

      setNotification({ type: "success", message: `Termin ${term.od}-${term.do} je sada slobodan! ✅` });
      if (typeof onClose === "function") onClose();
    } catch (err) {
      setNotification({ type: "error", message: "Greška pri oslobađanju termina ❌" });
      console.error(err);
    }
  };

  

  return { freeTerm, cancelReservation, notification, setNotification };
}
