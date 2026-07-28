import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    placeName: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    organizerId: { type: String, required: true, default: 'org-admin' },
    category: { type: String, required: true, default: 'general' },
    tags: { type: [String], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    location: {
      type: locationSchema,
      default: () => ({ placeName: '', latitude: null, longitude: null })
    },
    published: { type: Boolean, default: false },
    image: { type: String, default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87' },

    // Backward compatibility fields for frontend UI
    itemKey: { type: String, default: null },
    date: { type: String, default: null },
    seatsLeft: { type: Number, default: 50 }
  },
  { timestamps: true }
);

// Indexes for text search, tag filtering, date sorting, and publish status
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ tags: 1 });
eventSchema.index({ published: 1, startDate: 1 });
eventSchema.index({ category: 1, published: 1 });

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;
