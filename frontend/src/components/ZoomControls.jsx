import React from "react";
import { FaSearchPlus, FaSearchMinus } from "react-icons/fa";

export default function ZoomControls({ zoom, onZoomIn, onZoomOut }) {
  return (
    <div className="zoom-controls">
      <button onClick={onZoomOut}>
        <FaSearchMinus />
      </button>
      <button onClick={onZoomIn}>
        <FaSearchPlus />
      </button>
      <span>{Math.round(zoom * 100)}%</span>
    </div>
  );
}
