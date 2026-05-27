import React from 'react';

interface EditModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const EditModal = ({ title, children, onClose }: EditModalProps) => (
  <div className="edit-modal-backdrop" role="presentation">
    <div className="edit-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="edit-modal-head">
        <div>
          <p className="eyebrow">Manage activity</p>
          <h3>{title}</h3>
        </div>
        <button type="button" className="secondary-action compact" onClick={onClose}>Close</button>
      </div>
      {children}
    </div>
  </div>
);

export default EditModal;
