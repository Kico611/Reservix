import { useState, useEffect } from "react";

// Funkcija koja vraća početak tjedna (ponedjeljak)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = nedjelja
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export const useWeekSchedule = (scheduleData = [], weekStartDate = new Date()) => {
  const [weekStart, setWeekStart] = useState(getStartOfWeek(weekStartDate));
  const [dayTimes, setDayTimes] = useState({});
  const [weekSchedule, setWeekSchedule] = useState({});

  useEffect(() => {
    if (!scheduleData || !Array.isArray(scheduleData)) return;

    const startOfWeek = getStartOfWeek(weekStartDate);
    setWeekStart(startOfWeek);

    const times = {};
    const scheduleByDay = {};

    scheduleData.forEach((item) => {
      const date = new Date(item.date); // parsiranje datuma
      if (isNaN(date)) {
        console.warn("Invalid date in scheduleData:", item.date);
        return;
      }

      if (date >= startOfWeek && date < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        const dayName = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"][date.getDay() === 0 ? 6 : date.getDay() - 1];
        times[dayName] = { start: item.start, end: item.end };

        // grupiranje termina po danu
        if (!scheduleByDay[dayName]) scheduleByDay[dayName] = [];
        scheduleByDay[dayName].push({
          od: item.start,
          do: item.end,
          datum: date,
          rezervirao: item.rezervirao,
          status: item.status || "slobodno",
        });
      }
    });

    setDayTimes(times);
    setWeekSchedule(scheduleByDay);

  }, [scheduleData, weekStartDate]);

  // intervali npr. svakih 30 min između 08:00 i 20:00
  const intervals = [];
  for (let h = 8; h < 20; h++) {
    intervals.push({ time: `${h.toString().padStart(2, "0")}:00`, label: `${h}:00` });
    intervals.push({ time: `${h.toString().padStart(2, "0")}:30`, label: `${h}:30` });
  }

  return { weekStart, dayTimes, weekSchedule, intervals };
};
