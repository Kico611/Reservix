import { useState, useEffect } from "react";

export const useWeekSchedule = (scheduleData = [], weekStart) => {
  const [dayTimes, setDayTimes] = useState({});
  const [weekSchedule, setWeekSchedule] = useState({});
  const [intervals, setIntervals] = useState([]);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!scheduleData || !Array.isArray(scheduleData)) return;
    if (!weekStart) return;

    // Normaliziramo weekStart na ponoć
    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0, 0, 0, 0);

    const times = {};
    const scheduleByDay = {};

    scheduleData.forEach((item) => {
      const date = new Date(item.date);
      if (isNaN(date)) {
        console.warn("Invalid date in scheduleData:", item.date);
        return;
      }

      // Provjera da li datum pripada tjednu
      if (date >= startOfWeek && date < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        const dayName = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"][date.getDay() === 0 ? 6 : date.getDay() - 1];

        times[dayName] = { start: item.start, end: item.end };

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

    // Generiranje labela u formatu dd.mm - dd.mm
    const formatDate = (date) => {
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${d}.${m}`;
    };
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    setLabel(`${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`);

    // Generiranje intervala po pola sata
    const ints = [];
    for (let h = 8; h < 20; h++) {
      ints.push({ time: `${h.toString().padStart(2, "0")}:00`, label: `${h}:00` });
      ints.push({ time: `${h.toString().padStart(2, "0")}:30`, label: `${h}:30` });
    }
    setIntervals(ints);

  }, [scheduleData, weekStart]);

  return { dayTimes, weekSchedule, intervals, label };
};
