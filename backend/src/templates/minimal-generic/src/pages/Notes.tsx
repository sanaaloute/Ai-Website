import { useEffect, useState } from 'react';
import { Section } from '@/components/layout/Section';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { createNote, deleteNote, listNotes, updateNote, type Note } from '@/lib/api/notes';
import { useToast } from '@/hooks/useToast';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    listNotes()
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) {
          addToast({ variant: 'error', title: 'Error', message: 'Could not load notes.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        const updated = await updateNote(editingId, { title, body });
        if (updated) {
          setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)));
          addToast({ variant: 'success', title: 'Updated', message: 'Note saved.' });
        }
      } else {
        const created = await createNote({ title, body });
        setNotes((prev) => [created, ...prev]);
        addToast({ variant: 'success', title: 'Created', message: 'Note added.' });
      }
      resetForm();
    } catch {
      addToast({ variant: 'error', title: 'Error', message: 'Could not save note.' });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
  };

  const handleDelete = async (id: string) => {
    try {
      const ok = await deleteNote(id);
      if (ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        addToast({ variant: 'success', title: 'Deleted', message: 'Note removed.' });
      }
    } catch {
      addToast({ variant: 'error', title: 'Error', message: 'Could not delete note.' });
    }
  };

  return (
    <Section>
      <Container size="md">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Notes</h1>
        <p className="mt-2 text-muted-foreground">A simple CRUD example wired to PocketBase with a localStorage fallback.</p>

        <Card className="mt-8 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="note-title" className="mb-2 block text-sm font-medium">
                Title
              </label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
              />
            </div>
            <div>
              <label htmlFor="note-body" className="mb-2 block text-sm font-medium">
                Body
              </label>
              <Input
                id="note-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Note body"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={loading}>
                {editingId ? 'Update note' : 'Add note'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="mt-8 space-y-4">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground">No notes yet. Create one above.</p>
          )}
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{note.title}</h2>
                  {note.body && <p className="mt-1 text-sm text-muted-foreground">{note.body}</p>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(note)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(note.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
