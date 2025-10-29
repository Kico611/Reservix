import React, { useState, useEffect } from "react";
import { useSalon } from "../context/SalonContext";
import WeekNavigator from "../components/WeekNavigator";
import ZoomControls from "../components/ZoomControls";
import { days, getWeekRange } from "../utils/dateUtils";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ScheduleTable from "../components/ScheduleTable";
import "../styles/Home.css";
import TermModal from "../components/TermModal";
import CancelModal from "../components/CancelModal";
import FreeModal from "../components/FreeModal";


export default function Home() {
  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [termToCancel, setTermToCancel] = useState(null);
  const { salon, setSalon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [notification, setNotification] = useState(null); // nova poruka

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConfirmCancel = () => {
    cancelReservation(
      salon.id,
      termToCancel.rezervirao,
      termToCancel.od,
      termToCancel.do,
      termToCancel.datum
    ).then(() => {
      setCancelModalOpen(false);
      setTermToCancel(null);
      setSelectedTerm(null); // ovo sada radi sigurno jer cancelReservation završi
    });
  };
  const freeTerm = async (datum, term) => {
    const docRef = doc(db, "saloni", salon.id, "raspored", datum);

    try {
      // Dohvati trenutni dokument
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

      // Update Firestore-a s filtriranim nizom
      await updateDoc(docRef, {
        zauzeti_termini: updatedTerms,
      });

      // Update lokalnog state-a
      setSalon((prev) => {
        const newRaspored = { ...prev.raspored };
        newRaspored[datum].zauzeti_termini = updatedTerms;
        return { ...prev, raspored: newRaspored };
      });

      setNotification({
        type: "success",
        message: `Termin ${term.od}-${term.do} je sada slobodan! ✅`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: "Došlo je do greške pri oslobađanju termina ❌",
      });
    }
  };

  const canBookInterval = (dayShort, startTime, duration) => {
    const dayTerms = weekSchedule[dayShort] || [];
    const dayStartMin = timeToMinutes(dayTimes[dayShort].start);
    const dayEndMin = timeToMinutes(dayTimes[dayShort].end);

    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;

    // Provjeri da li termin izlazi izvan radnog vremena
    if (startMin < dayStartMin || endMin > dayEndMin) return false;

    // Provjeri da li se termin preklapa s postojećim terminima
    for (let term of dayTerms) {
      if (term.status === "otkazan") continue;
      const termStart = timeToMinutes(term.od);
      const termEnd = timeToMinutes(term.do);

      // Ako se preklapaju
      if (Math.max(startMin, termStart) < Math.min(endMin, termEnd)) {
        return false;
      }
    }

    return true;
  };

  const cancelReservation = async (
    salonId,
    rezervirao,
    odTime,
    doTime,
    datum
  ) => {
    try {
      const response = await fetch(
        "http://localhost:8000/cancel_reservation/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salonId,
            rezervirao,
            od: odTime,
            do: doTime,
            datum,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // update termina u tablici
        setSelectedTerm((prev) => ({
          ...prev,
          term: { ...prev.term, status: "otkazan" },
        }));

        // zatvori modal
        setSelectedTerm(null);

        setNotification({
          type: "success",
          message: `Termin od ${odTime} do ${doTime} je uspješno otkazan! ✅`,
        });
      } else {
        setNotification({
          type: "error",
          message: `Greška pri otkazivanju: ${
            data.error || "Nepoznata greška"
          } ❌`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Došlo je do pogreške prilikom slanja zahtjeva ❌`,
      });
      console.error(err);
    }
  };

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

  const confirmCancelReservation = (term) => {
    setTermToCancel(term);
    setCancelModalOpen(true);
  };

  const handleZoomIn = () => {
    if (zoom < 2) setZoom(+(zoom + 0.1).toFixed(1));
  };

  const handleZoomOut = () => {
    if (zoom > 0.5) setZoom(+(zoom - 0.1).toFixed(1));
  };

  if (loading) return <div>Loading...</div>;

  const { monday, sunday, label } = getWeekRange(weekStart);

  const weekSchedule = {};
  const dayTimes = {};
  if (salon?.raspored) {
    Object.entries(salon.raspored).forEach(([datum, data]) => {
      const date = new Date(datum);
      if (date >= monday && date <= sunday) {
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];

        weekSchedule[dayName] = (data.zauzeti_termini || []).map((t) => ({
          ...t,
          datum, // dodajemo datum dokumenta
        }));

        if (data.pocetak_rada && data.kraj_rada) {
          dayTimes[dayName] = {
            start: data.pocetak_rada,
            end: data.kraj_rada,
          };
        }
      }
    });
  }

  const formatIntervalLabel = (h, m) =>
    m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const generateIntervalsForWeek = (dayTimes) => {
    if (Object.keys(dayTimes).length === 0) return [];
    let earliest = "20:00";
    let latest = "07:00";

    Object.values(dayTimes).forEach(({ start, end }) => {
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    });

    const [startH, startM] = earliest.split(":").map(Number);
    const [endH, endM] = latest.split(":").map(Number);

    const result = [];
    let h = startH;
    let m = startM;

    while (h < endH || (h === endH && m < endM)) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}`;
      if (timeToMinutes(time) >= timeToMinutes(`${endH}:${endM}`)) break;
      result.push({ time, label: formatIntervalLabel(h, m) });
      m += 15;
      if (m >= 60) {
        m = 0;
        h += 1;
      }
    }

    return result;
  };

  const intervals = generateIntervalsForWeek(dayTimes);

  const handleTermClick = (dayShort, time, term, datum) => {
    if (!datum) return; // osiguraj da imamo pravi datum

    if (term) {
      setSelectedTerm({
        day: dayShort,
        datum, // koristi datum iz rasporeda
        time,
        term: { ...term, datum },
        isBooked: true,
      });
    } else {
      setSelectedTerm({
        day: dayShort,
        datum, // koristi datum iz rasporeda
        time,
        isBooked: false,
      });
    }
  };

  

  return (
    <div className="main-content">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} />
      {windowWidth > 768 && (
        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

      <ScheduleTable
  salon={salon}
  intervals={intervals}
  weekSchedule={weekSchedule}
  dayTimes={dayTimes}
  zoom={zoom}
  handleTermClick={handleTermClick}
  days={days}
/>

{selectedTerm && (
  <TermModal
    selectedTerm={selectedTerm}
    salon={salon}
    onClose={() => setSelectedTerm(null)}
    onCancel={confirmCancelReservation}
    onFree={freeTerm}
    canBookInterval={canBookInterval}
    setNotification={setNotification}
  />
)}


  {cancelModalOpen && (
  <CancelModal
    termToCancel={termToCancel}
    onClose={() => setCancelModalOpen(false)}
    onConfirm={handleConfirmCancel}
  />
)}

{freeModalOpen && (
  <FreeModal
    selectedTerm={selectedTerm}
    onClose={() => setFreeModalOpen(false)}
    onConfirm={async (term) => {
      await freeTerm(term.datum, term.term);
      setFreeModalOpen(false);
      setSelectedTerm(null);
    }}
  />
)}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
