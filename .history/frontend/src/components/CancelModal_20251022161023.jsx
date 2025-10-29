import React from "react";

export default function CancelModal({ termToCancel, onClose, onConfirm }) {
  if (!termToCancel) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Potvrda otkazivanja</h3>
        <p>
          Jeste li sigurni da želite otkazati termin {termToCancel.od} - {termToCancel.do}?
        </p>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Odustani</button>
          <button className="modal-delete-btn" onClick={() => onConfirm(termToCancel)}>Potvrdi otkazivanje</button>
        </div>
      </div>
    </div>
  );
}
