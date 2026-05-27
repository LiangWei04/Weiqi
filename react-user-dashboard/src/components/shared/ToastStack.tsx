const ToastStack = ({
  toasts,
  onClose,
}: {
  toasts: Array<{ id: number; message: string }>;
  onClose: (id: number) => void;
}) => (
  <div className="toast-stack" aria-live="polite">
    {toasts.map((toast) => (
      <Toast key={toast.id} message={toast.message} onClose={() => onClose(toast.id)} />
    ))}
  </div>
);

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="toast-message" role="status">
    <span>{message}</span>
    <button type="button" onClick={onClose} aria-label="Dismiss notification">x</button>
  </div>
);

export default ToastStack;
