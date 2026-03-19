"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  actions,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="font-serif text-xl text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            取消
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}
