import { useState } from 'react';
import { User, ChevronDown, Loader2 } from 'lucide-react';
import { useUsers } from '../../hooks/useLeads';
import type { User as UserType } from '../../types/lead';

interface AssigneeDropdownProps {
  assigneeId?: string;
  assigneeName?: string;
  onAssigneeChange: (assigneeId: string | undefined, assigneeName: string | undefined) => Promise<void>;
  disabled?: boolean;
}

export function AssigneeDropdown({
  assigneeId,
  assigneeName,
  onAssigneeChange,
  disabled,
}: AssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { data: users, isLoading: usersLoading } = useUsers();

  const handleSelect = async (user: UserType | null) => {
    const newId = user?.id;
    const newName = user?.email;

    if (newId === assigneeId) {
      setIsOpen(false);
      return;
    }

    setIsPending(true);
    setIsOpen(false);
    try {
      await onAssigneeChange(newId, newName);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isPending || usersLoading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <User className="w-4 h-4" />
        )}
        {assigneeName || 'Unassigned'}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-56 bg-white rounded-lg shadow-lg border overflow-hidden max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                !assigneeId ? 'bg-gray-50 font-medium' : ''
              }`}
            >
              <User className="w-4 h-4 text-gray-400" />
              Unassigned
            </button>
            {users?.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  user.id === assigneeId ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <User className="w-4 h-4 text-gray-600" />
                <span className="truncate">{user.email}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
