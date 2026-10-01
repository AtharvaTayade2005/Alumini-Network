import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ai } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Card, Button, Input, EmptyState, Badge, Spinner } from '../components/ui.jsx'

export default function Assistant() {
  const { user, role } = useAuth()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: `Hello ${user?.name || 'there'}! I am your AI Career & Networking Intelligence Assistant. I can analyze your resume, recommend alumni mentors from Microsoft and Google, highlight high-demand skills, and evaluate job readiness.`,
      suggestedActions: [
        { label: 'Find Recommended Mentors', query: 'Find mentors in software engineering and systems design' },
        { label: 'Analyze Job Readiness', query: 'Evaluate my job readiness for Frontend and Full-Stack roles' },
        { label: 'Check Resume ATS Score', query: 'How does my resume perform in ATS screening?' },
      ],
    },
  ])
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(textToSend) {
    const text = (textToSend || draft).trim()
    if (!text || loading) return

    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setDraft('')
    setLoading(true)

    try {
      const response = await ai.chat(text)
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: response.text,
        suggestedActions: response.suggestedActions || [],
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: 'I ran into a temporary hiccup processing that question. Please try asking again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto space-y-4">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-swiss-border pb-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-1">
            10 &mdash; CAREER INTELLIGENCE & ADVISORY
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-swiss-text">
            AI CAREER ASSISTANT
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/job-readiness">
            <Button size="sm" variant="secondary">JOB READINESS &rarr;</Button>
          </Link>
          <Link to="/resume-analyzer">
            <Button size="sm" variant="secondary">RESUME ANALYZER &rarr;</Button>
          </Link>
        </div>
      </header>

      <Card className="flex flex-col flex-1 overflow-hidden border border-swiss-border">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-sm px-4 py-3.5 text-xs sm:text-sm space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-swiss-text text-swiss-base'
                    : 'bg-swiss-surface border border-swiss-border text-swiss-text'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={msg.role === 'user' ? 'slate' : 'blue'}>
                    {msg.role === 'user' ? 'YOU' : 'AI CAREER ADVISOR'}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {msg.suggestedActions?.length > 0 && (
                  <div className="pt-2 border-t border-swiss-border/50 flex flex-wrap gap-2">
                    {msg.suggestedActions.map((act, idx) => {
                      if (act.to) {
                        return (
                          <Link key={idx} to={act.to}>
                            <Button size="sm" variant="secondary" className="text-[11px] font-mono">
                              {act.label} &rarr;
                            </Button>
                          </Link>
                        )
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(act.query || act.label)}
                          className="px-2.5 py-1 text-[11px] font-mono rounded-xs border border-swiss-border hover:bg-swiss-surface-hover text-swiss-text transition-colors"
                        >
                          {act.label} &rarr;
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-swiss-surface border border-swiss-border text-swiss-muted rounded-sm px-4 py-3 text-xs flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" />
                <span className="font-mono text-xs uppercase tracking-widest text-swiss-label">
                  Analyzing profile & network directory...
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="border-t border-swiss-border p-3 sm:p-4 bg-swiss-base flex items-center gap-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about mentorship, resume ATS checks, interview prep, or career steps..."
            className="flex-1 text-xs sm:text-sm"
            disabled={loading}
          />
          <Button type="submit" disabled={!draft.trim() || loading}>
            {loading ? <Spinner /> : 'SEND &rarr;'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
