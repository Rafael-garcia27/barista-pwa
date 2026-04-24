import { useState, useEffect } from 'react'

interface Note {
  id: string
  text: string
  createdAt: string
}

const STORAGE_KEY = 'barista-dev-notes'

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

interface DevNotesProps {
  isOpen: boolean
  onClose: () => void
}

export function DevNotes({ isOpen, onClose }: DevNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) setNotes(loadNotes())
  }, [isOpen])

  function addNote() {
    if (!draft.trim()) return
    const updated = [
      { id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString() },
      ...notes,
    ]
    setNotes(updated)
    saveNotes(updated)
    setDraft('')
  }

  function deleteNote(id: string) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
  }

  function exportNotes() {
    const text = [
      `Barista App — Dev Notes (${new Date().toLocaleDateString('de')})`,
      '='.repeat(40),
      '',
      ...notes.map(n =>
        `[${new Date(n.createdAt).toLocaleString('de', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}]\n${n.text}`
      ).join('\n\n---\n\n'),
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 flex w-72 flex-col bg-stone-950 shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-5 pt-14 pb-4 border-b border-stone-800">
          <div className="text-[9px] font-bold uppercase tracking-widest text-stone-600 mb-0.5">Privat · Nur für dich</div>
          <div className="text-base font-semibold text-stone-200">Dev Notes</div>
          <div className="text-xs text-stone-500 mt-0.5">Ideen, Bugs, Wünsche</div>
        </div>

        {/* Input area */}
        <div className="px-4 py-4 border-b border-stone-800">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                addNote()
              }
            }}
            placeholder="Was stört dich? Was fehlt dir?"
            className="w-full rounded-xl bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 resize-none outline-none focus:ring-1 focus:ring-amber-600"
            rows={3}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!draft.trim()}
            className="mt-2 w-full rounded-xl bg-amber-700 py-2 text-xs font-semibold text-white disabled:opacity-30"
          >
            Notieren
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {notes.length === 0 && (
            <div className="py-10 text-center text-xs text-stone-700">
              Noch keine Notizen.
            </div>
          )}
          {notes.map(note => (
            <div key={note.id} className="rounded-xl bg-stone-900 px-3 py-2.5">
              <div className="text-[10px] text-stone-600 mb-1">
                {new Date(note.createdAt).toLocaleString('de', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              <div className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{note.text}</div>
              <button
                type="button"
                onClick={() => deleteNote(note.id)}
                className="mt-2 text-[10px] text-stone-700 active:text-red-500"
              >
                löschen
              </button>
            </div>
          ))}
        </div>

        {/* Export */}
        <div className="px-4 py-4 border-t border-stone-800">
          {notes.length > 0 ? (
            <button
              type="button"
              onClick={exportNotes}
              className="w-full rounded-xl border border-stone-700 py-2.5 text-xs font-semibold text-stone-300 active:bg-stone-800"
            >
              {copied ? '✓ In Zwischenablage kopiert' : `${notes.length} Notiz${notes.length !== 1 ? 'en' : ''} exportieren`}
            </button>
          ) : (
            <div className="text-center text-[10px] text-stone-800">
              Swipe vom linken Rand zum Öffnen
            </div>
          )}
        </div>
      </div>
    </>
  )
}
