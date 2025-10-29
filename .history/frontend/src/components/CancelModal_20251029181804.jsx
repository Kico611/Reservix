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

        {/* Ako je manual true, prikazujemo upozorenje */}
        {termToCancel.manual && (
          <p style={{ color: "orange", fontWeight: "bold" }}>
            Ovaj termin je ručno rezerviran – korisnik neće biti automatski obaviješten.
          </p>
        )}

        <div className="modal-actions">
          <button
            className="modal-delete-btn"
            onClick={() => onConfirm(termToCancel)}
          >
            Potvrdi otkazivanje
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Odustani
          </button>
        </div>
      </div>
    </div>
  );
}
