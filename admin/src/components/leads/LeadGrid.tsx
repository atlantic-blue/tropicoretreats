import { LeadCard } from './LeadCard';
import type { Lead } from '../../types/lead';

interface LeadGridProps {
  leads: Lead[];
}

export function LeadGrid({ leads }: LeadGridProps) {
  if (!leads.length) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">No leads found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your filters or check back later for new leads.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
