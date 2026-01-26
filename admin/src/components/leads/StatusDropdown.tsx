import { useState } from 'react';
import { ChevronDown, Loader2, Archive, RotateCcw } from 'lucide-react';
import type { LeadStatus } from '../../types/lead';

const STATUS_ORDER: LeadStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  WON: 'Won',
  LOST: 'Lost',
  ARCHIVED: 'Archived',
};

const statusColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-slate-200 text-slate-600',
};

function getValidStatuses(current: LeadStatus, previousStatus?: string): LeadStatus[] {
  // For archived leads, show restore option (previous status or all statuses)
  if (current === 'ARCHIVED') {
    if (previousStatus && STATUS_ORDER.includes(previousStatus as LeadStatus)) {
      return [previousStatus as LeadStatus, ...STATUS_ORDER.filter(s => s !== previousStatus)];
    }
    return STATUS_ORDER;
  }

  const currentIndex = STATUS_ORDER.indexOf(current);
  // Can progress forward, or move to WON/LOST from any state
  if (current === 'WON' || current === 'LOST') {
    return ['WON', 'LOST', 'ARCHIVED'];
  }
  // Can move forward or jump to WON/LOST, plus archive option
  const forwardStatuses = STATUS_ORDER.slice(currentIndex);
  return [...forwardStatuses, 'ARCHIVED'];
}

interface StatusDropdownProps {
  status: LeadStatus;
  previousStatus?: string;
  onStatusChange: (status: LeadStatus) => Promise<void>;
  disabled?: boolean;
}

export function StatusDropdown({ status, previousStatus, onStatusChange, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const validStatuses = getValidStatuses(status, previousStatus);
  const isArchived = status === 'ARCHIVED';

  const handleSelect = async (newStatus: LeadStatus) => {
    if (newStatus === status) {
      setIsOpen(false);
      return;
    }
    setIsPending(true);
    setIsOpen(false);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isPending}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${statusColors[status]} hover:opacity-80 transition-opacity disabled:opacity-50`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : null}
        {statusLabels[status]}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-48 bg-white rounded-lg shadow-lg border overflow-hidden">
            {isArchived && previousStatus && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect(previousStatus as LeadStatus)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-b"
                >
                  <RotateCcw className="w-4 h-4 text-teal-600" />
                  <span className="text-teal-600 font-medium">Restore to {statusLabels[previousStatus as LeadStatus]}</span>
                </button>
                <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50">Or change to:</div>
              </>
            )}
            {validStatuses.filter(s => !isArchived || s !== previousStatus).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  s === status ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                {s === 'ARCHIVED' && <Archive className="w-4 h-4 text-slate-500" />}
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[s]}`}>
                  {statusLabels[s]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
