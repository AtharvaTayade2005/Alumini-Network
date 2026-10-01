import { db } from '../data/index.js'
import { authService } from './auth.service.js'

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const aiService = {
  async askAssistant(prompt) {
    await delay(400)
    const p = prompt.toLowerCase()

    if (p.includes('mentor') || p.includes('guidance')) {
      return {
        text: `Based on your profile and skills in React and Systems Engineering, I recommend connecting with **Aarav Mehta** (Senior SWE at Microsoft) or **Neha Kapoor** (Senior PM at Google). Both alumni actively mentor students from your department and offer 1-on-1 architecture review sessions.`,
        suggestedActions: [
          { label: 'View Aarav Mehta Profile', to: '/alumni/u_alumni_1' },
          { label: 'Browse All Mentors', to: '/mentorship' },
        ],
      }
    }

    if (p.includes('job') || p.includes('internship') || p.includes('hiring')) {
      return {
        text: `I found 3 high-affinity openings matching your profile:\n\n1. **Frontend Engineer (Jira Core Systems)** at Atlassian (React, TypeScript)\n2. **Associate Product Manager Intern** at Google\n3. **Machine Learning Engineering Intern** at Flipkart\n\nYour profile has an 85%+ keyword overlap for the Atlassian role.`,
        suggestedActions: [
          { label: 'View Atlassian Job', to: '/jobs/job_002' },
          { label: 'View All Jobs', to: '/jobs' },
        ],
      }
    }

    if (p.includes('resume') || p.includes('cv') || p.includes('ats')) {
      return {
        text: `Your current resume has an estimated ATS compatibility score of **88/100**.\n\n**Key Strengths:**\n- Concrete technical achievements and quantifiable project outcomes.\n- Strong modern stack keywords (React, TypeScript, PostgreSQL).\n\n**Actionable Improvements:**\n- Add system benchmarking figures (e.g. latency, concurrency limits).\n- Include unit test coverage methodologies.`,
        suggestedActions: [
          { label: 'Open Resume Analyzer', to: '/resume-analyzer' },
          { label: 'Manage Resumes', to: '/resume' },
        ],
      }
    }

    return {
      text: `Here is a personalized recommendation for you:\n\n1. **Expand your network**: Connect with alumni working in cloud platforms.\n2. **Target upcoming events**: The *Scalable Distributed Systems Workshop* on Nov 5th aligns with your career goals.\n3. **Mentorship**: Book a 30-minute introductory session before mid-term campus drives.`,
      suggestedActions: [
        { label: 'Explore Events', to: '/events' },
        { label: 'Find a Mentor', to: '/mentorship' },
      ],
    }
  },

  async analyzeJobReadiness(jobTitle = 'Frontend Engineer') {
    await delay(350)
    return {
      data: {
        targetRole: jobTitle,
        overallScore: 84,
        marketDemand: 'High (14 active campus recruiters)',
        skillMatchBreakdown: [
          { skill: 'React & Modern Hooks', match: 95, status: 'Mastered' },
          { skill: 'TypeScript & Type Systems', match: 90, status: 'Proficient' },
          { skill: 'System Design & State Management', match: 80, status: 'Intermediate' },
          { skill: 'Testing (Jest/Playwright)', match: 65, status: 'Needs Improvement' },
          { skill: 'CI/CD & Cloud Deployment', match: 70, status: 'Intermediate' },
        ],
        recommendedSteps: [
          'Add automated end-to-end test suites to your portfolio projects',
          'Practice system design mock interviews with alumni mentors',
          'Review WCAG accessibility compliance rules for UI components',
        ],
        recommendedMentors: [
          { id: 'u_alumni_1', name: 'Aarav Mehta', company: 'Microsoft', role: 'Senior SWE' },
          { id: 'u_alumni_4', name: 'Pooja Iyer', company: 'Atlassian', role: 'Frontend Engineer' },
        ],
      },
    }
  },

  async analyzeResume(resumeText) {
    await delay(450)
    return {
      data: {
        score: 88,
        matchRate: '91%',
        detectedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Socket.io', 'Git', 'REST'],
        missingSkills: ['Jest / Unit Testing', 'Docker / Kubernetes', 'GraphQL'],
        grammarAndFormatting: 'Excellent formatting, zero typos detected, strong bullet point structure.',
        impactAnalysis: 'Good usage of quantified results (e.g. 65% latency reduction, 150+ requests).',
      },
    }
  },

  async getSemanticSearch(query) {
    await delay(300)
    const users = db.get('users')
    const jobs = db.get('jobs')

    const q = query.toLowerCase()
    const matchedUsers = users.filter((u) => (
      u.name.toLowerCase().includes(q) ||
      u.headline?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    ))

    const matchedJobs = jobs.filter((j) => (
      j.title.toLowerCase().includes(q) ||
      j.skills?.some((s) => s.name.toLowerCase().includes(q)) ||
      j.companyName.toLowerCase().includes(q)
    ))

    return {
      data: {
        query,
        members: matchedUsers,
        jobs: matchedJobs,
        similarityScore: '0.94 cosine similarity',
      },
    }
  },
}
