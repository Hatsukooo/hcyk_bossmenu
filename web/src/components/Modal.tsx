import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <button className="close-btn" onClick={onClose}>X</button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default Modal;