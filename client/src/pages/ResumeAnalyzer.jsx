import { useState } from 'react'
import { Card, Button, Badge, EmptyState, Field, Input } from '../components/ui.jsx'

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('empty') // 'empty', 'uploading', 'analyzing', 'success'

  const handleUpload = (e) => {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setTimeout(() => {
      setStatus('analyzing')
      setTimeout(() => {
        setStatus('success')
      }, 1500)
    }, 1000)
  }

  const reset = () => {
    setFile(null)
    setStatus('empty')
  }

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">11 &mdash; RESUME ANALYZER</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">RESUME ANALYZER</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Upload your resume for AI-powered skill extraction, formatting checks, and improvement recommendations.
        </p>
      </header>

      {status === 'empty' && (
        <Card className="p-10 max-w-2xl">
          <form onSubmit={handleUpload} className="space-y-6 text-center">
            <div className="border-2 border-dashed border-swiss-border rounded-sm p-12 hover:border-swiss-text transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="resume-upload"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                <svg className="w-8 h-8 text-swiss-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {file ? (
                  <span className="text-swiss-text font-medium">{file.name}</span>
                ) : (
                  <span className="text-swiss-muted">DROP RESUME HERE OR BROWSE FILES</span>
                )}
                <span className="text-xs text-swiss-label mt-2">Supported formats: PDF, DOCX</span>
              </label>
            </div>
            <Button type="submit" disabled={!file} className="w-full">
              Analyze Resume
            </Button>
          </form>
        </Card>
      )}

      {(status === 'uploading' || status === 'analyzing') && (
        <Card className="p-10 max-w-2xl text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-swiss-border border-t-swiss-text rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-swiss-text">
            {status === 'uploading' ? 'UPLOADING...' : 'ANALYZING RESUME...'}
          </h2>
          <p className="text-sm text-swiss-muted mt-2 font-mono uppercase tracking-widest text-[10px]">
            Parsing text and extracting skills
          </p>
        </Card>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-swiss-text">Analysis Complete</h2>
            <Button variant="secondary" onClick={reset}>Analyze another resume</Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-swiss-text mb-4 uppercase font-mono tracking-widest">Extracted Skills</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-swiss-label mb-2">DETECTED</p>
                  <div className="flex flex-wrap gap-2">
                    {['JavaScript', 'React', 'Node.js', 'SQL'].map(s => <Badge key={s} tone="slate">{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-swiss-label mb-2">RECOMMENDED ADDITIONS</p>
                  <div className="flex flex-wrap gap-2">
                    {['TypeScript', 'GraphQL', 'AWS'].map(s => <Badge key={s} tone="blue">{s}</Badge>)}
                  </div>
                </div>
              </div>
              <p className="mt-8 text-[10px] font-mono tracking-widest text-red-400 uppercase">
                BACKEND DEPENDENCY: POST /ai/resume/analyze
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-swiss-text mb-4 uppercase font-mono tracking-widest">Formatting</h3>
              <ul className="space-y-3 text-sm text-swiss-muted">
                <li className="flex gap-2">
                  <span className="text-green-500">✓</span> Length (1 page)
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">✓</span> Contact info present
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">✗</span> Action verbs missing in 3 bullets
                </li>
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-swiss-text mb-4 uppercase font-mono tracking-widest">Improvement Areas</h3>
            <div className="space-y-4 text-sm text-swiss-muted">
              <p><strong>Experience:</strong> Try quantifying your achievements in the "Frontend Developer" role. How much did performance improve?</p>
              <p><strong>Skills:</strong> You mention Node.js in your summary but it doesn't appear in your recent experience sections.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
