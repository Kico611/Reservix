import React from "react";
import { days, timeToMinutes, generateIntervalsForWeek } from "../utils/dateUtils";
import { formatPhoneNumber } from "../utils/helpers";

export default function ScheduleTable({ salon, weekStart, zoom, modalState, setModalState }) {
  if (!salon?.raspored) return <div className="no-schedule">Postavite radno vrijeme</div>;

  // pripremi weekSchedule i dayTimes
  const weekSchedule = {};
  const dayTimes = {};
  const { monday, sunday } = { /* getWeekRange logic */ };

  Object.entries(salon.raspored).forEach(([datum, data]) => {
    const date = new Date(datum);
    if (date >= monday && date <= sunday) {
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      weekSchedule[dayName] = (data.zauzeti_termini || []).map(t => ({ ...t, datum }));
      if (data.pocetak_rada && data.kraj_rada) dayTimes[dayName] = { start: data.pocetak_rada, end: data.kraj_rada };
    }
  });

  const intervals = generateIntervalsForWeek(dayTimes);

  const handleTermClick = (day, time, term, datum) => {
    setModalState({ ...modalState, selectedTerm: term ? { day, datum, time, term, isBooked: true } : { day, datum, time, isBooked: false } });
  };

  const getTermCells = (day) => {
    // ista logika kao prije, ali poziva handleTermClick i koristi modalState
  };

  return (
    <div className="table-container" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
      <table>
        <thead>
          <tr>
            <th></th>
            {intervals.map(it => <th key={it.time} className="hour-cell">{it.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td className="day-cell">{day}</td>
              {getTermCells(day)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
