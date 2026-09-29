import ComingSoon from './ComingSoon.jsx'

export default function Events() {
  return (
    <ComingSoon
      title="Events & Reunions"
      description="Host reunions, workshops and talks, then manage attendance."
      planned={[
        'Create events with venue, capacity and registration deadlines',
        'RSVP and manage your own registrations',
        'Email and in-app reminders before each event',
        'Cancel events and notify all registrants',
      ]}
    />
  )
}
