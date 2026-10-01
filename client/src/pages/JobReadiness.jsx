import { Card, Badge, Button, EmptyState } from '../components/ui.jsx'

export default function JobReadiness() {
  const readinessScore = 78

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-swiss-label uppercase mb-2">12 &mdash; JOB READINESS</p>
        <h1 className="text-3xl font-bold tracking-tight text-swiss-text">JOB READINESS</h1>
        <p className="mt-2 text-sm text-swiss-muted">
          Compare your current skills against industry expectations for your target role.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-sm font-mono tracking-widest uppercase text-swiss-label">Target Role</h2>
                <p className="text-xl font-bold text-swiss-text">Frontend Developer</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-mono tracking-widest uppercase text-swiss-label">Current Readiness</h2>
                <p className="text-2xl font-bold text-swiss-text">{readinessScore}%</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase font-mono tracking-widest border-b border-swiss-border pb-2">Skill Gap Analysis</h3>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-swiss-text">React</span>
                  <span className="text-swiss-label">High match</span>
                </div>
                <div className="w-full bg-swiss-base h-2 rounded-sm overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-swiss-text">TypeScript</span>
                  <span className="text-swiss-label">Medium match</span>
                </div>
                <div className="w-full bg-swiss-base h-2 rounded-sm overflow-hidden">
                  <div className="bg-yellow-500 h-full" style={{ width: '60%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-swiss-text">Testing (Jest / Cypress)</span>
                  <span className="text-swiss-label">Low match</span>
                </div>
                <div className="w-full bg-swiss-base h-2 rounded-sm overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-swiss-text">System Design</span>
                  <span className="text-swiss-label">Missing</span>
                </div>
                <div className="w-full bg-swiss-base h-2 rounded-sm overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: '10%' }} />
                </div>
              </div>

              <p className="mt-4 text-[10px] font-mono tracking-widest text-red-400 uppercase">
                BACKEND DEPENDENCY: POST /ai/readiness/analyze
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest border-b border-swiss-border pb-2 mb-4">Career Roadmap</h3>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm">
                <span className="font-mono text-green-500">01</span>
                <div>
                  <p className="font-medium text-swiss-text">Core Skills</p>
                  <p className="text-swiss-muted text-xs">Completed</p>
                </div>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="font-mono text-blue-500">02</span>
                <div>
                  <p className="font-medium text-swiss-text">Testing Fundamentals</p>
                  <p className="text-swiss-muted text-xs">In Progress</p>
                </div>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="font-mono text-swiss-label">03</span>
                <div>
                  <p className="font-medium text-swiss-muted">System Design</p>
                  <p className="text-swiss-label text-xs">Locked</p>
                </div>
              </li>
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-4">Recommended Actions</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-swiss-text hover:underline block">Complete "Intro to Testing" course</a>
                <span className="text-xs text-swiss-label">Boosts readiness by 10%</span>
              </li>
              <li>
                <a href="#" className="text-swiss-text hover:underline block">Update resume with recent projects</a>
                <span className="text-xs text-swiss-label">Improves ATS match</span>
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase font-mono tracking-widest mb-4">Recommended Mentors</h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-[var(--color-swiss-surface-hover)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-swiss-text truncate">Sarah Jenkins</p>
                  <p className="text-xs text-swiss-muted truncate">Senior Frontend Dev</p>
                </div>
              </div>
              <Button size="sm" className="w-full">View Profile</Button>
            </div>
            <p className="mt-4 text-[10px] font-mono tracking-widest text-red-400 uppercase">
              BACKEND DEPENDENCY: GET /ai/mentors/recommendations
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
