import { db } from '../data/index.js'
import { authService } from './auth.service.js'

const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

export const eventsService = {
  async list(params = {}) {
    await delay()
    const session = await authService.getSession()
    const currentUserId = session.data.id
    let eventsList = db.get('events')

    if (params.category && params.category !== 'all') {
      eventsList = eventsList.filter((e) => e.category === params.category)
    }

    if (params.tab === 'my_events') {
      eventsList = eventsList.filter((e) => e.rsvpUsers?.includes(currentUserId) || e.organizerId === currentUserId)
    } else if (params.tab === 'past') {
      eventsList = eventsList.filter((e) => e.status === 'completed' || new Date(e.date) < new Date())
    } else if (params.tab === 'upcoming') {
      eventsList = eventsList.filter((e) => e.status === 'published' && new Date(e.date) >= new Date())
    }

    const enhanced = eventsList.map((e) => ({
      ...e,
      hasRsvpd: e.rsvpUsers?.includes(currentUserId) || false,
      isOrganizer: e.organizerId === currentUserId,
    }))

    return {
      data: enhanced,
      meta: { total: enhanced.length },
    }
  },

  async byId(eventId) {
    await delay()
    const session = await authService.getSession()
    const currentUserId = session.data.id
    const eventsList = db.get('events')
    const event = eventsList.find((e) => e.id === eventId) || eventsList[0]

    return {
      data: {
        ...event,
        hasRsvpd: event.rsvpUsers?.includes(currentUserId) || false,
        isOrganizer: event.organizerId === currentUserId,
      },
    }
  },

  async rsvp(eventId) {
    await delay(80)
    const session = await authService.getSession()
    const userId = session.data.id

    db.update('events', (e) => e.id === eventId, (e) => {
      const users = e.rsvpUsers || []
      if (!users.includes(userId)) {
        return {
          ...e,
          rsvpUsers: [...users, userId],
          attendeesCount: (e.attendeesCount || 0) + 1,
        }
      }
      return e
    })

    return { message: 'RSVP confirmed! Added to your events schedule.' }
  },

  async cancelRsvp(eventId) {
    await delay(80)
    const session = await authService.getSession()
    const userId = session.data.id

    db.update('events', (e) => e.id === eventId, (e) => {
      const users = e.rsvpUsers || []
      return {
        ...e,
        rsvpUsers: users.filter((id) => id !== userId),
        attendeesCount: Math.max(0, (e.attendeesCount || 1) - 1),
      }
    })

    return { message: 'RSVP cancelled.' }
  },

  async create(payload) {
    await delay(120)
    const session = await authService.getSession()
    const user = session.data

    const newEvent = {
      id: `evt_${Date.now()}`,
      title: payload.title,
      description: payload.description,
      date: payload.date,
      time: payload.time || '18:00',
      endTime: payload.endTime || '20:00',
      location: payload.location,
      venueAddress: payload.venueAddress || null,
      category: payload.category || 'networking',
      categoryLabel: payload.category ? payload.category.toUpperCase() : 'Networking Event',
      attendeesCount: 1,
      capacity: Number(payload.capacity) || 200,
      isVirtual: Boolean(payload.isVirtual),
      virtualLink: payload.virtualLink || null,
      organizer: user.name,
      organizerId: user.id,
      speakers: payload.speakers || [],
      status: 'published',
      rsvpUsers: [user.id],
      coverBadge: payload.isVirtual ? 'VIRTUAL EVENT' : 'IN-PERSON EVENT',
    }

    db.insert('events', newEvent)
    return { data: newEvent, message: 'Event created and published!' }
  },
}
