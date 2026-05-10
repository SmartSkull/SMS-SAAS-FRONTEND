'use client';
import { X } from 'lucide-react';

interface Props {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message = 'Are you sure? This action cannot be undone.', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl card shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Confirm Delete</h2>
          <button onClick={onCancel}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}
