import React from 'react';

interface EditModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const EditModal = ({ title, children, onClose }: EditModalProps) => {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return (
    <dialog ref={dialogRef} className="edit-modal native-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="edit-modal-head">
        <div>
          <h3>{title}</h3>
        </div>
        <button type="button" className="secondary-action compact" onClick={onClose}>Close</button>
      </div>
      {children}
    </dialog>
  );
};

export default EditModal;
