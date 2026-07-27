import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    ticketType: { type: String, default: 'standard' },
    attendees: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    agreeTerms: { type: Boolean, required: true }
  },
  { timestamps: true }
);

export const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
export default Registration;
