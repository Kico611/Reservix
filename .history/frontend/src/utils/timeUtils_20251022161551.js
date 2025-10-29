export const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export const formatIntervalLabel = (h, m) =>
  m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;

export const generateIntervalsForWeek = (dayTimes) => {
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
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
