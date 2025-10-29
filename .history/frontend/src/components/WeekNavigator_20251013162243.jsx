import React from "react";

export default function WeekNavigator({ label, onPrev, onNext }) {
  return (
    <div className="week-nav">
      <button onClick={onPrev}>&lt;</button>
      <span>{label}</span>
      <button onClick={onNext}>&gt;</button>
    </div>
  );
}
