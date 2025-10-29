import React from "react";

export default function CancelModal({ termToCancel, onClose, onConfirm }) {
  if (!termToCancel) return null;

  // Provjera rezervacije
  const rezervirao = termToCancel.rezervirao?.trim() || "";
  let warningMessage = "";

  if (rezervirao === "") {
    warningMessage = "Termin će biti otkazan, ali klijent neće dobiti obavijest jer nemamo zapisani broj ili ime.";
  } else if (isNaN(Number(rezervirao))) {
    warningMessage = "Termin će biti otkazan, ali klijent neće dobiti obavijest jer nemamo zapisani broj ili ime.";
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Potvrda otkazivanja</h3>
        <p>
          Jeste li sigurni da želite otkazati termin {termToCancel.od} - {termToCancel.do}?
        </p>

        {warningMessage && (
          <p style={{ color: "red", fontWeight: "bold" }}>{warningMessage}</p>
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
