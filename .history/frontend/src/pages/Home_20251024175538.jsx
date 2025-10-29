// Home.jsx
import React, { useState, useEffect } from "react";
import { useSalon } from "../context/SalonContext";
import WeekNavigator from "../components/WeekNavigator";
import ZoomControls from "../components/ZoomControls";
import ScheduleTable from "../components/ScheduleTable";
import ModalsContainer from "../components/ModalsContainer";
import Notification from "../components/Notification";

import { days } from "../utils/dateUtils";
import { useReservations } from "../hooks/useReservations";
import { canBookInterval } from "../utils/timeUtils";
import { useWeekSchedule } from "../hooks/useWeekSchedule";

import "../styles/Home.css";

export default function Home() {
  const { freeTerm, cancelReservation, notification, setNotification } = useReservations();
  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [termToCancel, setTermToCancel] = useState(null);
  const { salon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(getMonday(new Date())); // po defaultu početak trenutnog tjedna
  const [zoom, setZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedTerm, setSelectedTerm] = useState(null);

  // Hook vraća sve što treba
  const { weekSchedule, dayTimes, intervals, label } = useWeekSchedule(salon, weekStart);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      setSelectedTerm(null);
    });
  };

  const prevWeek = () =>
    setWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () =>
    setWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));

  const confirmCancelReservation = (term) => {
    setTermToCancel(term);
    setCancelModalOpen(true);
  };

  const handleZoomIn = () => zoom < 2 && setZoom(+(zoom + 0.1).toFixed(1));
  const handleZoomOut = () => zoom > 0.5 && setZoom(+(zoom - 0.1).toFixed(1));

  // NOVO: handleTermClick s točnim datumom iz tjedna
  const handleTermClick = (dayShort, time, term, datumFromWeek) => {
    console.log("Clicked term:", { dayShort, time, term, datumFromWeek });

    if (!datumFromWeek) return;
    setSelectedTerm(
      term
        ? { day: dayShort, datum: datumFromWeek, time, term: { ...term, datum: datumFromWeek }, isBooked: true }
        : { day: dayShort, datum: datumFromWeek, time, isBooked: false }
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="main-content">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} />
      {windowWidth > 768 && (
        <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      )}

      <ScheduleTable
        salon={salon}
        intervals={intervals}
        weekSchedule={weekSchedule}
        dayTimes={dayTimes}
        zoom={zoom}
        handleTermClick={handleTermClick}
        days={days}
        weekStart={weekStart} // prosljeđujemo početak tjedna
      />

      <ModalsContainer
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        cancelModalOpen={cancelModalOpen}
        setCancelModalOpen={setCancelModalOpen}
        termToCancel={termToCancel}
        setTermToCancel={setTermToCancel}
        freeModalOpen={freeModalOpen}
        setFreeModalOpen={setFreeModalOpen}
        freeTerm={freeTerm}
        confirmCancelReservation={confirmCancelReservation}
        handleConfirmCancel={handleConfirmCancel}
        canBookInterval={(day, start, duration) =>
          canBookInterval(weekSchedule, dayTimes, day, start, duration)
        }
        salon={salon}
        setNotification={setNotification}
      />

      <Notification notification={notification} setNotification={setNotification} />
    </div>
  );
}

// Helper funkcija: vraća ponedjeljak trenutnog tjedna
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // ako je nedjelja, idi natrag 6 dana
  return new Date(d.setDate(d.getDate() + diff));
}
