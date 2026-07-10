import { pb } from '@/lib/pocketbase';

export interface Note {
  id: string;
  title: string;
  body: string;
  created: string;
  updated: string;
}

const STORAGE_KEY = 'lovecode-notes';

function localList(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function localSave(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function localCreate(data: Omit<Note, 'id' | 'created' | 'updated'>): Note {
  const notes = localList();
  const note: Note = {
    id: makeId(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...data,
  };
  localSave([note, ...notes]);
  return note;
}

function localUpdate(id: string, data: Partial<Omit<Note, 'id' | 'created' | 'updated'>>) {
  const notes = localList();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  notes[index] = { ...notes[index], ...data, updated: new Date().toISOString() };
  localSave(notes);
  return notes[index];
}

function localDelete(id: string) {
  const notes = localList();
  const filtered = notes.filter((n) => n.id !== id);
  localSave(filtered);
  return filtered.length !== notes.length;
}

export async function listNotes(): Promise<Note[]> {
  try {
    return await pb.collection('notes').getFullList<Note>({ sort: '-created' });
  } catch {
    return localList();
  }
}

export async function createNote(data: Omit<Note, 'id' | 'created' | 'updated'>): Promise<Note> {
  try {
    return await pb.collection('notes').create<Note>(data);
  } catch {
    return localCreate(data);
  }
}

export async function updateNote(
  id: string,
  data: Partial<Omit<Note, 'id' | 'created' | 'updated'>>,
): Promise<Note | null> {
  try {
    return await pb.collection('notes').update<Note>(id, data);
  } catch {
    return localUpdate(id, data);
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    await pb.collection('notes').delete(id);
    return true;
  } catch {
    return localDelete(id);
  }
}
