export const mockConversations = [
  {
    id: 'conv_001',
    participants: ['u_student_1', 'u_alumni_1'],
    lastMessage: 'Great progress on the distributed log! Looking forward to our call on Monday at 5 PM.',
    lastMessageAt: '2026-10-01T14:32:00.000Z',
    unreadCount: {
      u_student_1: 1,
      u_alumni_1: 0,
    },
  },
  {
    id: 'conv_002',
    participants: ['u_student_1', 'u_prof_1'],
    lastMessage: 'Riya, please review the revised syllabus for the Advanced Operating Systems lab.',
    lastMessageAt: '2026-09-30T16:15:00.000Z',
    unreadCount: {
      u_student_1: 0,
      u_prof_1: 0,
    },
  },
  {
    id: 'conv_003',
    participants: ['u_alumni_1', 'u_prof_1'],
    lastMessage: 'Hello Dr. Kulkarni! Always happy to deliver a guest lecture on Azure Cosmos DB architecture.',
    lastMessageAt: '2026-09-29T18:40:00.000Z',
    unreadCount: {
      u_alumni_1: 0,
      u_prof_1: 0,
    },
  },
  {
    id: 'conv_004',
    participants: ['u_alumni_1', 'u_student_3'],
    lastMessage: 'Hi Aarav, thank you for accepting my connect request!',
    lastMessageAt: '2026-10-01T07:18:00.000Z',
    unreadCount: {
      u_alumni_1: 1,
      u_student_3: 0,
    },
  },
  {
    id: 'conv_005',
    participants: ['u_prof_2', 'u_student_2'],
    lastMessage: 'Dev, Flipkart has reviewed your internship application positively. Let me know when you receive the offer letter.',
    lastMessageAt: '2026-09-30T11:05:00.000Z',
    unreadCount: {
      u_student_2: 0,
      u_prof_2: 0,
    },
  },
]

export const mockMessages = [
  // Conversation 1: Riya Shah <-> Aarav Mehta
  {
    id: 'msg_001',
    conversationId: 'conv_001',
    senderId: 'u_student_1',
    recipientId: 'u_alumni_1',
    body: 'Hi Aarav! Thank you for accepting my mentorship request.',
    createdAt: '2026-09-19T10:00:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_002',
    conversationId: 'conv_001',
    senderId: 'u_alumni_1',
    recipientId: 'u_student_1',
    body: 'Welcome Riya! Let me know what specific questions you have about distributed consensus or system design.',
    createdAt: '2026-09-19T11:15:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_003',
    conversationId: 'conv_001',
    senderId: 'u_student_1',
    recipientId: 'u_alumni_1',
    body: 'I finished the prototype for the distributed write-ahead log using Raft leader election. Here is the repo link: https://github.com/riyashah/campus-food',
    createdAt: '2026-10-01T13:45:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_004',
    conversationId: 'conv_001',
    senderId: 'u_alumni_1',
    recipientId: 'u_student_1',
    body: 'Great progress on the distributed log! Looking forward to our call on Monday at 5 PM.',
    createdAt: '2026-10-01T14:32:00.000Z',
    isRead: false,
  },

  // Conversation 2: Riya Shah <-> Dr. Rajesh Kulkarni
  {
    id: 'msg_005',
    conversationId: 'conv_002',
    senderId: 'u_prof_1',
    recipientId: 'u_student_1',
    body: 'Riya, please review the revised syllabus for the Advanced Operating Systems lab.',
    createdAt: '2026-09-30T16:15:00.000Z',
    isRead: true,
  },

  // Conversation 3: Aarav Mehta <-> Dr. Rajesh Kulkarni
  {
    id: 'msg_006',
    conversationId: 'conv_003',
    senderId: 'u_prof_1',
    recipientId: 'u_alumni_1',
    body: 'Aarav, could you join as our alumni keynote for the Cloud Architecture workshop next month?',
    createdAt: '2026-09-29T15:20:00.000Z',
    isRead: true,
  },
  {
    id: 'msg_007',
    conversationId: 'conv_003',
    senderId: 'u_alumni_1',
    recipientId: 'u_prof_1',
    body: 'Hello Dr. Kulkarni! Always happy to deliver a guest lecture on Azure Cosmos DB architecture.',
    createdAt: '2026-09-29T18:40:00.000Z',
    isRead: true,
  },
]
