import { Link } from 'react-router';
import { Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/Badge';
import type { Lead, LeadStatus, Temperature } from '../../types/lead';

const statusColors: Record<LeadStatus, { badge: 'blue' | 'yellow' | 'purple' | 'green' | 'gray'; border: string }> = {
  NEW: { badge: 'blue', border: 'border-l-blue-500' },
  CONTACTED: { badge: 'yellow', border: 'border-l-yellow-500' },
  QUOTED: { badge: 'purple', border: 'border-l-purple-500' },
  WON: { badge: 'green', border: 'border-l-green-500' },
  LOST: { badge: 'gray', border: 'border-l-gray-500' },
};

const tempColors: Record<Temperature, string> = {
  HOT: 'text-red-500',
  WARM: 'text-orange-400',
  COLD: 'text-blue-400',
};

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  const statusStyle = statusColors[lead.status];
  const tempColor = tempColors[lead.temperature];

  return (
    <Link
      to={`/leads/${lead.id}`}
      className={`block p-4 bg-white rounded-lg shadow-sm border-l-4 hover:shadow-md transition-shadow ${statusStyle.border}`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-900">
          {lead.firstName} {lead.lastName}
        </h3>
        <Flame className={`w-5 h-5 ${tempColor}`} aria-label={`Temperature: ${lead.temperature}`} />
      </div>
      <div className="mt-2">
        <Badge variant={statusStyle.badge}>{lead.status}</Badge>
      </div>
      <p className="text-gray-500 text-sm mt-2" title={new Date(lead.createdAt).toLocaleString()}>
        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
      </p>
    </Link>
  );
}
