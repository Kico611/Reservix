import { useSalon } from "../context/SalonContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useState } from "react";

export function useReservations() {
  const { salon, setSalon } = useSalon();
  const [notification, setNotification] = useState(null);

const freeTerm = async (datum, term, onClose) => {
  if (!salon?.id) {
    console.error("❌ Greška: salon.id nije definiran!");
    setNotification({
      type: "error",
      message: "Greška: salon nije ispravno učitan ❌",
    });
    return;
  }

  // ✅ Provjera da termin ima uneseno ime/broj
  if (!term.rezervirao || term.rezervirao.trim() === "") {
    setNotification({
      type: "error",
      message: "Termin se ne može osloboditi bez broja telefona ili imena! ❌",
    });
    return;
  }

  const datumString =
    datum instanceof Date ? datum.toISOString().split("T")[0] : String(datum);
  const salonId = String(salon.id);

  try {
    const docRef = doc(db, "saloni", salonId, "raspored", datumString);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const updatedTerms = (data.zauzeti_termini || []).filter(
      (t) =>
        !(
          t.od === term.od &&
          t.do === term.do &&
          t.rezervirao === term.rezervirao
        )
    );

    await updateDoc(docRef, { zauzeti_termini: updatedTerms });

    setSalon((prev) => {
      const newRaspored = { ...prev.raspored };
      if (newRaspored[datumString]) {
        newRaspored[datumString].zauzeti_termini = updatedTerms;
      }
      return { ...prev, raspored: newRaspored };
    });

    setNotification({
      type: "success",
      message: `Termin ${term.od}-${term.do} je sada slobodan! ✅`,
    });

    // ✅ Zatvori modal odmah nakon uspjeha
    if (typeof onClose === "function") onClose();
    
  } catch (err) {
    console.error("⚠️ Greška pri oslobađanju termina:", err);
    setNotification({
      type: "error",
      message: "Došlo je do greške pri oslobađanju termina ❌",
    });
  }
};

const cancelReservation = async (salonId, rezervirao, odTime, doTime, datum, manual = false) => {
  try {
    const datumString = datum instanceof Date ? datum.toISOString().split("T")[0] : datum;

    if (manual){,{
        salonId,
        rezervirao,
        odTime,
        doTime,
        datum: datumString,
      });

      const docRef = doc(db, "saloni", salonId, "raspored", datumString);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn("Dokument ne postoji u Firestore:", datumString);
        return false;
      }

      const data = docSnap.data();

      // Mapiraj samo termin koji odgovara i dodaj status "otkazan"
      const updatedTerms = (data.zauzeti_termini || []).map((t) =>
        t.od === odTime && t.do === doTime && t.rezervirao === rezervirao
          ? { ...t, status: "otkazan" }
          : t
      );

      await updateDoc(docRef, { zauzeti_termini: updatedTerms });

      setNotification({
        type: "info",
        message: `Ručni termin od ${odTime} do ${doTime} je označen kao otkazan. ❗ Obavijestite korisnika ručno.`,
      });

      return true;
    }

    const response = await fetch("http://localhost:8000/cancel_reservation/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, rezervirao, od: odTime, do: doTime, datum: datumString }),
    });

    const data = await response.json();

    if (data.success) {
      setNotification({
        type: "success",
        message: `Termin od ${odTime} do ${doTime} je uspješno otkazan! ✅`,
      });
    } else {
      setNotification({
        type: "error",
        message: `Greška pri otkazivanju: ${data.error || "Nepoznata greška"} ❌`,
      });
    }

    return data.success;
  } catch (err) {
    setNotification({
      type: "error",
      message: "Došlo je do pogreške prilikom slanja zahtjeva ❌",
    });
    return false;
  }
};
  return { freeTerm, cancelReservation, notification, setNotification };
}
