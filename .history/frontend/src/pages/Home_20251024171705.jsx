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
import "../styles/WeekNavigator.css";
import "../styles/ZoomControls.css";
import "../styles/ScheduleTable.css";
import "../styles/Modals.css";
import "../styles/Notification.css";
import "../styles/ReservationForm.css";

export default function Home() {
  const { freeTerm, cancelReservation, notification, setNotification } = useReservations();
  const [freeModalOpen, setFreeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [termToCancel, setTermToCancel] = useState(null);
  const { salon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(new Date());
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

  if (loading) return <div>Loading...</div>;

  const handleTermClick = (dayShort, time, term, datum) => {
    if (!datum) return;
    setSelectedTerm(
      term
        ? { day: dayShort, datum, time, term: { ...term, datum }, isBooked: true }
        : { day: dayShort, datum, time, isBooked: false }
    );
  };

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
