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

const cancelReservation = async (salonId, rezervirao, odTime, doTime, datum) => {
  try {
    console.log("🔹 Slanje zahtjeva za otkazivanje termina...", {
      salonId,
      rezervirao,
      odTime,
      doTime,
      datum,
    });

    const response = await fetch("http://localhost:8000/cancel_reservation/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, rezervirao, od: odTime, do: doTime, datum }),
    });

    const data = await response.json();

    console.log("📥 Odgovor s backend-a:", data);

    setNotification(null);
    setTimeout(() => {
      if (data.success) {
        console.log("✅ Termin uspješno otkazan.");

        let message = `Termin od ${odTime} do ${doTime} je uspješno otkazan! ✅`;

        if (data.whatsappSent === false) {
          console.warn("⚠️ WhatsApp poruka NIJE poslana.");
          message += " ⚠️ Klijent neće primiti obavijest na WhatsApp.";
        } else {
          console.log("📱 WhatsApp poruka je poslana.");
        }

        setNotification({ type: "success", message });
      } else {
        console.error("❌ Greška pri otkazivanju:", data.error || "Nepoznata greška");
        setNotification({ type: "error", message: `Greška pri otkazivanju: ${data.error || "Nepoznata greška"} ❌` });
      }
    }, 10);

    return data.success;
  } catch (err) {
    console.error("⚠️ Pogreška pri slanju zahtjeva:", err);
    setNotification(null);
    setTimeout(() => {
      setNotification({ type: "error", message: "Došlo je do pogreške prilikom slanja zahtjeva ❌" });
    }, 10);
    return false;
  }
};