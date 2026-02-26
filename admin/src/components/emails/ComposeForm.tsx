import { useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { useSendEmail } from '../../hooks/useEmails';

interface ComposeFormProps {
  leadId: string;
  leadEmail: string;
  onSent: () => void;
  onCancel: () => void;
}

export function ComposeForm({ leadId, leadEmail, onSent, onCancel }: ComposeFormProps) {
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const sendEmail = useSendEmail(leadId);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bodyText.trim()) return;

    await sendEmail.mutateAsync({
      leadId,
      to: leadEmail,
      subject,
      bodyText,
    });

    setSubject('');
    setBodyText('');
    onSent();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          To: <span className="text-gray-900">{leadEmail}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        type="text"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Subject"
      />

      <textarea
        value={bodyText}
        onChange={(event) => setBodyText(event.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Write your message..."
        rows={6}
        autoFocus
      />

      {sendEmail.isError && (
        <p className="text-sm text-red-600">
          Failed to send: {sendEmail.error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sendEmail.isPending || !bodyText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sendEmail.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {sendEmail.isPending ? 'Sending...' : 'Send'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
