import { useState } from 'react'
import { ask, QUICK_QUESTIONS, type Answer } from '../engine/assistant'

interface BaristaAssistantProps {
  isOpen: boolean
  onClose: () => void
}

export function BaristaAssistant({ isOpen, onClose }: BaristaAssistantProps) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [asked, setAsked] = useState(false)
  function handleAsk(q: string) {
    const result = ask(q)
    setAnswer(result)
    setAsked(true)
    setQuery('')
  }

  function handleClose() {
    setQuery('')
    setAnswer(null)
    setAsked(false)
    onClose()
  }

  function handleReset() {
    setQuery('')
    setAnswer(null)
    setAsked(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">☕</span>
            <div>
              <div className="text-sm font-semibold text-gray-900">Ask the Barista</div>
              <div className="text-[10px] text-gray-400">Powered by the Coffee Bible</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-10 space-y-4">
          {/* Answer area */}
          {asked && (
            <div className="rounded-2xl bg-stone-900 px-4 py-4 space-y-2.5">
              {answer ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                    {answer.question}
                  </div>
                  <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
                    {answer.answer}
                  </p>
                  {answer.tip && (
                    <div className="rounded-xl bg-amber-500/15 border border-amber-500/20 px-3 py-2 text-xs text-amber-300 leading-relaxed">
                      {answer.tip}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-stone-400 leading-relaxed">
                  I don't have a specific answer for that yet. Try asking about extraction, grind size, brew ratios, freshness, or bean origins.
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-amber-500 pt-1"
              >
                ← Ask another question
              </button>
            </div>
          )}

          {/* Quick questions */}
          {!asked && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                Common questions
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAsk(q)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && query.trim() && handleAsk(query.trim())}
              placeholder="Ask anything about coffee…"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => query.trim() && handleAsk(query.trim())}
              disabled={!query.trim()}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
