import { formatDistanceToNow } from 'date-fns';
import { Mail, Phone, Building2, Users, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { StatusDropdown } from './StatusDropdown';
import { TemperatureDropdown } from './TemperatureDropdown';
import { AssigneeDropdown } from './AssigneeDropdown';
import { NotesTimeline } from './NotesTimeline';
import { useUpdateLead } from '../../hooks/useLeadMutations';
import type { LeadWithNotes, LeadStatus, Temperature } from '../../types/lead';

interface LeadDetailProps {
  lead: LeadWithNotes;
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const updateLead = useUpdateLead(lead.id);

  const handleStatusChange = async (status: LeadStatus) => {
    await updateLead.mutateAsync({ status });
  };

  const handleTemperatureChange = async (temperature: Temperature) => {
    await updateLead.mutateAsync({ temperature });
  };

  const handleAssigneeChange = async (assigneeId: string | undefined, assigneeName: string | undefined) => {
    await updateLead.mutateAsync({ assigneeId, assigneeName });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Contact Info and Message */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {lead.firstName} {lead.lastName}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-400" />
              <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                {lead.email}
              </a>
            </div>

            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                  {lead.phone}
                </a>
              </div>
            )}

            {lead.company && (
              <div className="flex items-center gap-3 text-gray-600">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span>{lead.company}</span>
              </div>
            )}

            {lead.groupSize && (
              <div className="flex items-center gap-3 text-gray-600">
                <Users className="w-5 h-5 text-gray-400" />
                <span>{lead.groupSize} people</span>
              </div>
            )}

            {lead.preferredDates && (
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>{lead.preferredDates}</span>
              </div>
            )}

            {lead.destination && (
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{lead.destination}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-gray-500">
            Lead created {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </div>
        </div>

        {/* Message Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            Message
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{lead.message}</p>
        </div>
      </div>

      {/* Right Column - Status, Temperature, Assignee, Notes */}
      <div className="space-y-6">
        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <StatusDropdown
              status={lead.status}
              onStatusChange={handleStatusChange}
              disabled={updateLead.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
            <TemperatureDropdown
              temperature={lead.temperature}
              onTemperatureChange={handleTemperatureChange}
              disabled={updateLead.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to</label>
            <AssigneeDropdown
              assigneeId={lead.assigneeId}
              assigneeName={lead.assigneeName}
              onAssigneeChange={handleAssigneeChange}
              disabled={updateLead.isPending}
            />
          </div>
        </div>

        {/* Notes Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <NotesTimeline notes={lead.notes} leadId={lead.id} />
        </div>
      </div>
    </div>
  );
}
