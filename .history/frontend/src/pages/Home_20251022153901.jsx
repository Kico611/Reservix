import React, { useState, useEffect } from "react";
import { useSalon } from "../context/SalonContext";
import "../styles/Home.css";
import WeekNavigator from "../components/WeekNavigator";
import ZoomControls from "../components/ZoomControls";
import ScheduleTable from "../components/ScheduleTable";
import TermModal from "../components/TermModal";
import CancelModal from "../components/CancelModal";
import FreeModal from "../components/FreeModal";
import Notification from "../components/Notification";
import { getWeekRange, days } from "../utils/dateUtils";
import { freeTerm, cancelReservation, bookTerm } from "../utils/salonAPI";

export default function Home() {
  const { salon, setSalon, loading } = useSalon();
  const [weekStart, setWeekStart] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [notification, setNotification] = useState(null);
  const [modalState, setModalState] = useState({
    selectedTerm: null,
    freeModalOpen: false,
    cancelModalOpen: false,
    termToCancel: null,
  });

  // resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // prev/next week
  const prevWeek = () => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() - 7)));
  const nextWeek = () => setWeekStart(new Date(weekStart.setDate(weekStart.getDate() + 7)));

  if (loading) return <div>Loading...</div>;

  const { monday, sunday, label } = getWeekRange(weekStart);

  return (
    <div className="main-content">
      <WeekNavigator label={label} onPrev={prevWeek} onNext={nextWeek} />
      {windowWidth > 768 && <ZoomControls zoom={zoom} onZoomIn={() => setZoom(z => Math.min(z+0.1,2))} onZoomOut={() => setZoom(z => Math.max(z-0.1,0.5))} />}

      <ScheduleTable
        salon={salon}
        weekStart={weekStart}
        zoom={zoom}
        modalState={modalState}
        setModalState={setModalState}
      />

      <TermModal
        modalState={modalState}
        setModalState={setModalState}
        salon={salon}
        setSalon={setSalon}
        setNotification={setNotification}
        bookTerm={bookTerm}
      />

      <CancelModal
        modalState={modalState}
        setModalState={setModalState}
        cancelReservation={cancelReservation}
        setNotification={setNotification}
      />

      <FreeModal
        modalState={modalState}
        setModalState={setModalState}
        freeTerm={freeTerm}
        setSalon={setSalon}
        setNotification={setNotification}
      />

      <Notification notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}
