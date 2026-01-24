import { useState } from 'react';
import { Flame, ChevronDown, Loader2 } from 'lucide-react';
import type { Temperature } from '../../types/lead';

const TEMPERATURES: Temperature[] = ['HOT', 'WARM', 'COLD'];

const tempLabels: Record<Temperature, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
};

const tempColors: Record<Temperature, { icon: string; bg: string }> = {
  HOT: { icon: 'text-red-500', bg: 'bg-red-50 text-red-700' },
  WARM: { icon: 'text-orange-400', bg: 'bg-orange-50 text-orange-700' },
  COLD: { icon: 'text-blue-400', bg: 'bg-blue-50 text-blue-700' },
};

interface TemperatureDropdownProps {
  temperature: Temperature;
  onTemperatureChange: (temperature: Temperature) => Promise<void>;
  disabled?: boolean;
}

export function TemperatureDropdown({ temperature, onTemperatureChange, disabled }: TemperatureDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Default to WARM if temperature is undefined or invalid
  const safeTemperature = temperature && tempColors[temperature] ? temperature : 'WARM';
  const colors = tempColors[safeTemperature];

  const handleSelect = async (newTemp: Temperature) => {
    if (newTemp === temperature) {
      setIsOpen(false);
      return;
    }
    setIsPending(true);
    setIsOpen(false);
    try {
      await onTemperatureChange(newTemp);
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
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${colors.bg} hover:opacity-80 transition-opacity disabled:opacity-50`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Flame className={`w-4 h-4 ${colors.icon}`} />
        )}
        {tempLabels[safeTemperature]}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-36 bg-white rounded-lg shadow-lg border overflow-hidden">
            {TEMPERATURES.map((t) => {
              const tColors = tempColors[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelect(t)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    t === safeTemperature ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <Flame className={`w-4 h-4 ${tColors.icon}`} />
                  {tempLabels[t]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
