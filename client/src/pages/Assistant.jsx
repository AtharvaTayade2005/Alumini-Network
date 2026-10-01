import { useState, useRef, useEffect } from 'react'
import { Card, Button, Input, EmptyState } from '../components/ui.jsx'

export default function Assistant() {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('empty') // 'empty', 'loading', 'success', 'error'
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const suggest = (text) => {
    setDraft(text)
  }

  const send = (e) => {
    e.preventDefault()
    if (!draft.trim()) return

    const userMessage = { id: Date.now(), role: 'user', text: draft.trim() }
    setMessages((prev) => [...prev, userMessage])
    setDraft('')
    setStatus('loading')

    // Simulate AI response delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: "AI Assistant backend is not yet implemented. This is a frontend integration placeholder.", isMock: true }
      ])
      setStatus('success')
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <header className="mb-4 shrink-0">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">10 &mdash; AI ASSISTANT</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">AI ASSISTANT</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Ask anything about the Alumni Network, get career advice, and discover mentors.
        </p>
      </header>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center">
              <EmptyState
                title="How can I help you today?"
                description="The AI is designed to read your profile, search the directory, and suggest career steps."
              />
              <div className="mt-8 grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto w-full">
                {['Find mentors in software engineering', 'Help me prepare for a frontend interview', 'Show me relevant career opportunities', 'How can I improve my profile?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => suggest(suggestion)}
                    className="text-left px-4 py-3 rounded-sm border border-swiss-border bg-swiss-surface hover:bg-[var(--color-swiss-surface-hover)] transition-colors text-sm text-swiss-text"
                  >
                    {suggestion} &rarr;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-sm px-4 py-3 text-sm ${
                  msg.role === 'user' ? 'bg-swiss-text text-swiss-base' : 'bg-swiss-surface border border-swiss-border text-swiss-text'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.isMock && (
                    <p className="mt-3 text-[10px] font-mono tracking-widest text-red-400 uppercase">
                      BACKEND DEPENDENCY: POST /ai/chat
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {status === 'loading' && (
            <div className="flex justify-start">
              <div className="bg-swiss-surface border border-swiss-border text-swiss-muted rounded-sm px-4 py-3 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-swiss-muted animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-swiss-muted animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-swiss-muted animate-pulse delay-150" />
                <span className="ml-2 font-mono text-xs uppercase tracking-widest">Thinking</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="border-t border-swiss-border p-4 bg-swiss-base">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask something..."
              className="flex-1"
            />
            <Button type="submit" disabled={!draft.trim() || status === 'loading'}>Send</Button>
          </div>
          <p className="mt-2 text-center text-xs text-swiss-label font-mono uppercase tracking-widest">
            AI responses may be inaccurate.
          </p>
        </form>
      </Card>
    </div>
  )
}
