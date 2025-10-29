import React from "react";
import { days } from "../utils/dateUtils";

export default function ScheduleTable({
  weekSchedule,
  dayTimes,
  intervals,
  handleTermClick,
  formatPhoneNumber,
  weekStart,
}) {
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const dayShortToOffset = {
    Pon: 0,
    Uto: 1,
    Sri: 2,
    Čet: 3,
    Pet: 4,
    Sub: 5,
    Ned: 6,
  };

  const getDateForDay = (dayShort) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + (dayShortToOffset[dayShort] ?? 0));
    return date;
  };

  

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th></th>
            {intervals.map((it) => (
              <th key={it.time} className="hour-cell">
                {it.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
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
