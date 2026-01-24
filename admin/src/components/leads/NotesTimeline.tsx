import { useState, type FormEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Pencil } from 'lucide-react';
import { useAddNote, useUpdateNote } from '../../hooks/useLeadMutations';
import type { Note } from '../../types/lead';

interface NotesTimelineProps {
  notes: Note[];
  leadId: string;
}

export function NotesTimeline({ notes, leadId }: NotesTimelineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');
  const addNote = useAddNote(leadId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await addNote.mutateAsync(content);
    setContent('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Activity</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add note
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a note..."
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addNote.isPending || !content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addNote.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {addNote.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setContent('');
              }}
              className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 && !isAdding && (
        <p className="text-gray-500 text-sm">No activity yet. Add a note to get started.</p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <NoteItem key={note.id} note={note} leadId={leadId} />
        ))}
      </div>
    </div>
  );
}

interface NoteItemProps {
  note: Note;
  leadId: string;
}

function NoteItem({ note, leadId }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const updateNote = useUpdateNote(leadId);

  const isSystem = note.type === 'SYSTEM';

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    await updateNote.mutateAsync({ noteId: note.id, content: editContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(note.content);
  };

  return (
    <div className={`p-3 rounded-lg ${isSystem ? 'bg-gray-50' : 'bg-white border'}`}>
      <div className="flex justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">{note.authorName}</span>
        <span title={new Date(note.createdAt).toLocaleString()}>
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="mt-2 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateNote.isPending || !editContent.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              {updateNote.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className={`mt-1 text-sm ${isSystem ? 'text-gray-600 italic' : 'text-gray-800'}`}>
          {note.content}
        </p>
      )}

      {!isSystem && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}
