import ComingSoon from './ComingSoon.jsx'

export default function Jobs() {
  return (
    <ComingSoon
      title="Jobs & Internships"
      description="Post openings, browse the board and track applications."
      planned={[
        'Post and manage job listings, including internships',
        'Save jobs and set job alerts',
        'Apply and let employers update application status',
        'Recruiter-only posting with verification checks',
      ]}
    />
  )
}
