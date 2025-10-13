// src/components/Modal.jsx
export default function Modal({ open, onClose, children, maxWidth = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} mx-4 p-4`}>
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
