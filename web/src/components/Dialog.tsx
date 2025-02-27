import React from 'react';
import '../styles/Dialog.css';

interface DialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
  type?: 'info' | 'warning' | 'danger';
}

const Dialog: React.FC<DialogProps> = ({
  title,
  message,
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit',
  onConfirm,
  onCancel,
  isOpen,
  type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className={`dialog-header dialog-${type}`}>
          <h3>{title}</h3>
        </div>
        <div className="dialog-content">
          <p>{message}</p>
        </div>
        <div className="dialog-actions">
          <button 
            className={`dialog-button ${type === 'danger' ? 'danger-btn' : 'action-btn'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button className="dialog-button cancel-btn" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;