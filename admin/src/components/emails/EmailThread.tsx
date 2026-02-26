import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Mail, Send, Inbox, Paperclip, Loader2, RefreshCw } from 'lucide-react';
import { useEmails, useMarkRead } from '../../hooks/useEmails';
import { ComposeForm } from './ComposeForm';
import type { Email } from '../../types/lead';

interface EmailThreadProps {
  leadId: string;
  leadEmail: string;
}

export function EmailThread({ leadId, leadEmail }: EmailThreadProps) {
  const { data, isLoading, refetch, isRefetching } = useEmails(leadId);
  const markRead = useMarkRead(leadId);
  const [showCompose, setShowCompose] = useState(false);

  // Auto-mark-read when thread loads with unread emails
  useEffect(() => {
    if (!data?.emails) return;
    const hasUnread = data.emails.some(
      (email) => email.direction === 'inbound' && !email.readAt
    );
    if (hasUnread) {
      markRead.mutate();
    }
  }, [data?.emails]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-400" />
          Emails
          {data?.totalCount !== undefined && (
            <span className="text-sm font-normal text-gray-500">
              ({data.totalCount})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {showCompose && (
        <div className="border-b">
          <ComposeForm
            leadId={leadId}
            leadEmail={leadEmail}
            onSent={() => setShowCompose(false)}
            onCancel={() => setShowCompose(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !data?.emails.length ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No emails yet. Send the first one.
        </div>
      ) : (
        <div className="divide-y">
          {data.emails.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailItem({ email }: { email: Email }) {
  const [expanded, setExpanded] = useState(false);
  const isInbound = email.direction === 'inbound';
  const isUnread = isInbound && !email.readAt;

  return (
    <div
      className={`p-4 cursor-pointer hover:bg-gray-50 ${isUnread ? 'bg-blue-50/50' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-full ${isInbound ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isInbound ? (
            <Inbox className="w-4 h-4 text-green-600" />
          ) : (
            <Send className="w-4 h-4 text-blue-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                {isInbound ? email.fromAddress : `To: ${email.toAddress}`}
              </span>
              {isUnread && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0" title={format(new Date(email.sentAt), 'PPpp')}>
              {formatDistanceToNow(new Date(email.sentAt), { addSuffix: true })}
            </span>
          </div>

          <p className={`text-sm mt-0.5 ${isUnread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
            {email.subject || '(no subject)'}
          </p>

          {!expanded && (
            <p className="text-sm text-gray-500 mt-1 truncate">
              {email.bodyText.slice(0, 120)}
            </p>
          )}

          {expanded && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {email.bodyText}
              </div>

              {email.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      <Paperclip className="w-3 h-3" />
                      {attachment.filename}
                      <span className="text-gray-400">
                        ({Math.round(attachment.size / 1024)}KB)
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {email.operator && (
                <p className="text-xs text-gray-400">Sent by {email.operator}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
