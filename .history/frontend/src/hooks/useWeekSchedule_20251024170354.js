import { useState, useEffect } from "react";

// Funkcija koja vraća početak tjedna (ponedjeljak)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = nedjelja
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // ako je nedjelja, pomakni natrag
  return new Date(d.setDate(diff));
};

export const useWeekSchedule = (scheduleData) => {
  const [weekStart, setWeekStart] = useState(null);
  const [dayTimes, setDayTimes] = useState({});

  useEffect(() => {
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    setWeekStart(startOfWeek);

    const times = {};
    scheduleData.forEach((item) => {
      const date = new Date(item.date);
      if (date >= startOfWeek && date < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        const dayName = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"][date.getDay() === 0 ? 6 : date.getDay() - 1];
        times[dayName] = { start: item.start, end: item.end };
      }
    });

    setDayTimes(times);
  }, [scheduleData]);

  return { weekStart, dayTimes };
};
