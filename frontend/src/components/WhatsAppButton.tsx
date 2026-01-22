import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber = '447806705494',
  message = "Hello! I'm interested in learning more about Tropico Retreats corporate packages.",
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  // Show tooltip after 5 seconds, hide after 10 seconds
  React.useEffect(() => {
    const showTimer = setTimeout(() => {
      if (!isDismissed) {
        setIsTooltipVisible(true);
      }
    }, 5000);

    const hideTimer = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isDismissed]);

  const handleDismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTooltipVisible(false);
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip */}
      <div
        className={`transform transition-all duration-300 ${
          isTooltipVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative max-w-[280px] rounded-2xl bg-white p-4 shadow-2xl">
          <button
            onClick={handleDismissTooltip}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-sm font-medium text-gray-900">Need help planning your retreat?</p>
          <p className="mt-1 text-xs text-gray-600">
            Chat with us on WhatsApp for a quick response!
          </p>
          {/* Arrow */}
          <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 bg-white" />
        </div>
      </div>

      {/* WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/30"
        aria-label="Chat on WhatsApp"
        onMouseEnter={() => !isDismissed && setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <MessageCircle className="h-7 w-7 transition-transform group-hover:scale-110" />

        {/* Subtle pulse every 30 seconds */}
        <span
          className="absolute h-full w-full rounded-full bg-[#25D366]"
          style={{
            animation: 'pulse-slow 10s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes pulse-slow {
            0%, 3% { transform: scale(1); opacity: 0.25; }
            6% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}</style>
      </a>
    </div>
  );
};

export default WhatsAppButton;
