import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    itemKey: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true, enum: ['tech', 'culture', 'workshop', 'charity'] },
    location: { type: String, required: true },
    date: { type: String, required: true },
    seatsLeft: { type: Number, required: true, default: 50 },
    image: { type: String, default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87' },
    description: { type: String, required: true }
  },
  { timestamps: true }
);

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;
