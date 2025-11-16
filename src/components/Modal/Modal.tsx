import React from "react";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className={`bg-white text-black border-2 border-black shadow-[8px_8px_0_0_#000000] font-mono p-6 min-w-[320px] rounded-md relative max-w-[750px] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="text-2xl font-bold mb-4 border-b-2 border-black pb-2">
            {title}
          </div>
        )}
        <button
          className="absolute top-4 right-4 px-2 py-1 border-2 border-black bg-white text-black font-mono text-base shadow-[2px_2px_0_0_#000000] hover:bg-black hover:text-white active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all duration-100"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="text-lg">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
