import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ textAlign: 'center' }}>
        <div className="confirm-icon"></div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-text">{message}</div>
      </div>
    </Modal>
  );
}
