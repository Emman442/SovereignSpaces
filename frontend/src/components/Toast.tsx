import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full font-mono">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const borderClass =
    toast.type === 'success'
      ? 'border-l-4 border-l-[#16a34a]'
      : toast.type === 'error'
      ? 'border-l-4 border-l-[#dc2626]'
      : 'border-l-4 border-l-[#d97706]';

  return (
    <div
      className={`bg-[#111111] border border-[#222222] ${borderClass} p-4 text-white text-sm flex justify-between items-start transition-all duration-150 shadow-none`}
    >
      <div className="pr-3 leading-relaxed">{toast.text}</div>
      <button
        onClick={onClose}
        className="text-[#888888] hover:text-white hover:bg-[#1a1a1a] p-1 -mt-1 -mr-1 transition-colors"
      >
        ✕
      </button>
    </div>
  );
};
