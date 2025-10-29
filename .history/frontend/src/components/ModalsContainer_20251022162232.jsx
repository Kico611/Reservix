import React from "react";
import TermModal from "./TermModal";
import CancelModal from "./CancelModal";
import FreeModal from "./FreeModal";

export default function ModalsContainer({
  selectedTerm,
  setSelectedTerm,
  cancelModalOpen,
  setCancelModalOpen,
  termToCancel,
  setTermToCancel,
  freeModalOpen,
  setFreeModalOpen,
  freeTerm,
  confirmCancelReservation,
  handleConfirmCancel,
  canBookInterval,
  salon,
  setNotification
}) {
  return (
    <>
      {selectedTerm && (
        <TermModal
          selectedTerm={selectedTerm}
          salon={salon}
          onClose={() => setSelectedTerm(null)}
          onCancel={confirmCancelReservation}
          onFree={freeTerm}
          canBookInterval={canBookInterval}
          setNotification={setNotification}
        />
      )}

      {cancelModalOpen && (
        <CancelModal
          termToCancel={termToCancel}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {freeModalOpen && (
        <FreeModal
          selectedTerm={selectedTerm}
          onClose={() => setFreeModalOpen(false)}
          onConfirm={async (term) => {
            await freeTerm(term.datum, term.term);
            setFreeModalOpen(false);
            setSelectedTerm(null);
          }}
        />
      )}
    </>
  );
}
