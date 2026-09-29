import ComingSoon from './ComingSoon.jsx'

export default function Admin() {
  return (
    <ComingSoon
      title="Admin Dashboard"
      description="Moderation, verification and audit review for staff."
      planned={[
        'Review student and alumni verification requests',
        'Moderate reported content and suspend accounts',
        'Browse the audit log with actor and IP details',
        'Platform statistics on members, posts and activity',
      ]}
    />
  )
}
