export const useWeekSchedule = (scheduleData = [], weekStart) => {
  const [dayTimes, setDayTimes] = useState({});
  const [weekSchedule, setWeekSchedule] = useState({});

  useEffect(() => {
    if (!scheduleData || !Array.isArray(scheduleData)) return;
    if (!weekStart) return;

    const startOfWeek = new Date(weekStart);
    startOfWeek.setHours(0,0,0,0); // normaliziraj na ponoć

    const times = {};
    const scheduleByDay = {};

    scheduleData.forEach((item) => {
      const date = new Date(item.date);
      if (isNaN(date)) {
        console.warn("Invalid date in scheduleData:", item.date);
        return;
      }

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
  }, [scheduleData, weekStart]);

  const intervals = [];
  for (let h = 8; h < 20; h++) {
    intervals.push({ time: `${h.toString().padStart(2, "0")}:00`, label: `${h}:00` });
    intervals.push({ time: `${h.toString().padStart(2, "0")}:30`, label: `${h}:30` });
  }

  return { dayTimes, weekSchedule, intervals };
};
