import { useState } from 'react'
import { Card, Input, Button, Badge, EmptyState } from '../components/ui.jsx'

export default function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('empty') // 'empty', 'searching', 'results', 'no-results'

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setStatus('searching')
    setTimeout(() => {
      setStatus('results')
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">13 &mdash; GLOBAL SEARCH</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">SEMANTIC DISCOVERY</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Search intelligently across people, jobs, mentors, and events.
        </p>
      </header>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search for 'Frontend developers in San Francisco' or 'React workshops'..." 
            className="w-full text-lg py-3"
          />
        </div>
        <Button type="submit" disabled={!query.trim() || status === 'searching'} className="px-8">
          {status === 'searching' ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {status === 'empty' && (
        <Card className="p-10 text-center">
          <EmptyState
            title="What are you looking for?"
            description="The semantic search engine understands natural language queries."
          />
        </Card>
      )}

      {status === 'searching' && (
        <Card className="p-10 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-swiss-border border-t-swiss-text rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-swiss-text">SEARCHING...</h2>
          <p className="text-sm text-swiss-muted mt-2 font-mono uppercase tracking-widest text-[10px]">
            Querying vector database
          </p>
        </Card>
      )}

      {status === 'results' && (
        <div className="space-y-6">
          <div className="flex gap-2 font-mono text-xs tracking-widest uppercase">
            <Badge tone="blue">ALL</Badge>
            <Badge tone="slate">PEOPLE</Badge>
            <Badge tone="slate">JOBS</Badge>
            <Badge tone="slate">EVENTS</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="flex justify-between items-start mb-2">
                <Badge tone="slate">PERSON</Badge>
                <span className="text-xs text-green-500 font-mono">98% Match</span>
              </div>
              <h3 className="font-bold text-swiss-text text-lg">Rahul Sharma</h3>
              <p className="text-swiss-muted text-sm">Senior Frontend Engineer at Google</p>
              <div className="mt-4">
                <Button size="sm" variant="secondary">View Profile</Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-start mb-2">
                <Badge tone="slate">JOB</Badge>
                <span className="text-xs text-green-500 font-mono">92% Match</span>
              </div>
              <h3 className="font-bold text-swiss-text text-lg">Frontend Developer</h3>
              <p className="text-swiss-muted text-sm">FinTech Corp &bull; Remote</p>
              <div className="mt-4">
                <Button size="sm" variant="secondary">View Job</Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-start mb-2">
                <Badge tone="slate">EVENT</Badge>
                <span className="text-xs text-green-500 font-mono">85% Match</span>
              </div>
              <h3 className="font-bold text-swiss-text text-lg">React Performance Workshop</h3>
              <p className="text-swiss-muted text-sm">Online &bull; Tomorrow</p>
              <div className="mt-4">
                <Button size="sm" variant="secondary">View Event</Button>
              </div>
            </Card>
          </div>
          
          <p className="mt-8 text-center text-[10px] font-mono tracking-widest text-red-400 uppercase">
            BACKEND DEPENDENCY: GET /search/semantic
          </p>
        </div>
      )}
    </div>
  )
}
