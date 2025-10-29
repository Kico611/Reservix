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

  const cancelReservation = async ({ rezervirao, odTime, doTime, datum, manual = false }) => {
    if (!salon?.id) return false;

    const datumString = datum instanceof Date ? datum.toISOString().split("T")[0] : datum;
    const docRef = doc(db, "saloni", salon.id, "raspored", datumString);

    try {
      if (manual) {
        // --- Dohvati stvarni dokument iz Firestore ---
        const docSnap = await getDoc(docRef);
        const existingTerms = docSnap.exists() ? docSnap.data().zauzeti_termini || [] : [];

        // --- Ažuriraj samo termin koji se otkazuje ---
        const updatedTerms = existingTerms.map(t =>
          t.od === odTime && t.do === doTime && t.rezervirao === rezervirao
            ? { ...t, status: "otkazan" }
            : t
        );

        await updateDoc(docRef, { zauzeti_termini: updatedTerms });

        // --- Ažuriraj context sigurno ---
        setSalon(prev => {
          const newRaspored = { ...prev.raspored };
          if (!newRaspored[datumString]) newRaspored[datumString] = {};
          newRaspored[datumString].zauzeti_termini = updatedTerms;
          return { ...prev, raspored: newRaspored };
        });

        setNotification({ type: "success", message: `Termin ${odTime}-${doTime} je otkazan! ✅` });
        return true;
      }

      // --- Običan fetch na backend ako nije manual ---
      const response = await fetch("http://localhost:8000/cancel_reservation/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId: salon.id, rezervirao, od: odTime, do: doTime, datum: datumString }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ type: "success", message: `Termin ${odTime}-${doTime} je uspješno otkazan! ✅` });
        return true;
      } else {
        setNotification({ type: "error", message: `Greška pri otkazivanju: ${data.error || "Nepoznata greška"} ❌` });
        return false;
      }

    } catch (err) {
      setNotification({ type: "error", message: "Došlo je do pogreške prilikom otkazivanja ❌" });
      console.error(err);
      return false;
    }
  };
  

  return { freeTerm, cancelReservation, notification, setNotification };
}
