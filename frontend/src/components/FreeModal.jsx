import React from "react";

export default function FreeModal({ selectedTerm, onClose, onConfirm }) {
  if (!selectedTerm) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Potvrda oslobađanja termina</h3>
        <p>
          Jeste li sigurni da želite osloboditi termin {selectedTerm.term?.od} - {selectedTerm.term?.do}?
        </p>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Odustani</button>
          <button className="modal-delete-btn" onClick={() => onConfirm(selectedTerm)}>Potvrdi oslobađanje</button>
        </div>
      </div>
    </div>
  );
}
