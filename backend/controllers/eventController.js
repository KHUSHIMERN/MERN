import { isConnectedToMongoDB } from '../config/db.js';
import Event from '../models/Event.js';
import { INITIAL_EVENTS } from '../data/seedEvents.js';

/**
 * GET /api/events
 * Fetch all events with category and search filter support.
 */
export const getEvents = async (req, res, next) => {
  try {
    const { category, search } = req.query;

    if (isConnectedToMongoDB) {
      const query = {};
      if (category && category !== 'all') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      const events = await Event.find(query);
      return res.json({ success: true, count: events.length, data: events });
    }

    // In-memory fallback mode
    let results = [...INITIAL_EVENTS];
    if (category && category !== 'all') {
      results = results.filter((e) => e.category === category);
    }
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.location.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term)
      );
    }

    return res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id
 * Fetch single event by ID or itemKey.
 */
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isConnectedToMongoDB) {
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      return res.json({ success: true, data: event });
    }

    const event = INITIAL_EVENTS.find((e) => e.id === id || e.itemKey === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events
 * Create a new event.
 */
export const createEvent = async (req, res, next) => {
  try {
    const { title, category, location, date, seatsLeft, description, image, itemKey } = req.body;

    if (!title || !category || !location || !date) {
      return res.status(400).json({ success: false, message: 'Please provide all required event fields.' });
    }

    const newEventData = {
      id: `evt-${Date.now()}`,
      itemKey: itemKey || `evt_${Date.now()}`,
      title,
      category,
      location,
      date,
      seatsLeft: Number(seatsLeft) || 50,
      image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      description: description || ''
    };

    if (isConnectedToMongoDB) {
      const createdEvent = await Event.create(newEventData);
      return res.status(201).json({ success: true, data: createdEvent });
    }

    INITIAL_EVENTS.push(newEventData);
    return res.status(201).json({ success: true, data: newEventData });
  } catch (error) {
    next(error);
  }
};
