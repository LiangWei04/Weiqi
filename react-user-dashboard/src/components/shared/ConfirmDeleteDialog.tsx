interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  detail: string;
  reason: string;
  confirmLabel?: string;
  requireReason?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmDeleteDialog = ({
  open,
  title,
  detail,
  reason,
  confirmLabel = 'Delete',
  requireReason = true,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <p className="eyebrow">Confirm delete</p>
        <h3>{title}</h3>
        <p>{detail}</p>
        <div className="delete-reason-preview">
          <span>{requireReason ? 'Reason' : 'Reason optional'}</span>
          <strong>{reason || (requireReason ? 'No reason written yet' : 'Draft has not been published yet')}</strong>
          {requireReason && !reason.trim() && (
            <small>Write a reason before deleting because members may be affected.</small>
          )}
        </div>
        <div className="row-actions">
          <button type="button" className="secondary-action compact" onClick={onClose}>Cancel</button>
          <button type="button" className="danger-action compact" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
