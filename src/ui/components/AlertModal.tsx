type AlertModalProps = {
  message: string;
  onClose?: () => void;
};

export function AlertModal({ message, onClose }: AlertModalProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="sentinel-alert-title"
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="sentinel-alert-title" className="text-lg font-semibold text-gray-900">
          Shadow AI Sentinel
        </h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}
