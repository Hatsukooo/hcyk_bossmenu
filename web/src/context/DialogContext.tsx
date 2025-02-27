import React, { createContext, useState, useContext } from 'react';
import Dialog from '../components/Dialog';

interface DialogContextType {
  showDialog: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'info' | 'warning' | 'danger';
  }) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogProps, setDialogProps] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    type: 'info' | 'warning' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Potvrdit',
    cancelText: 'Zrušit',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'info'
  });

  const showDialog = ({
    title,
    message,
    confirmText = 'Potvrdit',
    cancelText = 'Zrušit',
    onConfirm,
    onCancel = () => {},
    type = 'info'
  }: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'info' | 'warning' | 'danger';
  }) => {
    setDialogProps({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      },
      onCancel: () => {
        onCancel();
        closeDialog();
      },
      type
    });
  };

  const closeDialog = () => {
    setDialogProps(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ showDialog, closeDialog }}>
      {children}
      <Dialog 
        isOpen={dialogProps.isOpen}
        title={dialogProps.title}
        message={dialogProps.message}
        confirmText={dialogProps.confirmText}
        cancelText={dialogProps.cancelText}
        onConfirm={dialogProps.onConfirm}
        onCancel={dialogProps.onCancel}
        type={dialogProps.type}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};