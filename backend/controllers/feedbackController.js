const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { memoryFeedbacks } = require('../data/seedEvents');

const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

/**
 * GET /api/events/:id/feedback
 * Fetch feedback reviews, rating breakdown, and user's own feedback for an event
 */
const getEventFeedback = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const currentUserId = req.user?._id?.toString() || req.user?.id?.toString() || req.query.userId;

    let reviews = [];

    if (isConnectedToMongoDB()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(eventId)
          ? { $or: [{ eventId: new mongoose.Types.ObjectId(eventId) }, { eventId }] }
          : { eventId };
        reviews = await Feedback.find(query).sort({ createdAt: -1 }).lean();
      } catch {
        reviews = [];
      }
    }

    if (!reviews || reviews.length === 0) {
      reviews = (memoryFeedbacks || []).filter(
        (f) => String(f.eventId) === String(eventId)
      );
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    });

    let userFeedback = null;
    if (currentUserId) {
      userFeedback =
        reviews.find(
          (r) =>
            r.userId?.toString() === currentUserId ||
            r.userEmail === req.user?.email ||
            r.userId === currentUserId
        ) || null;
    }

    return res.status(200).json({
      success: true,
      eventId,
      averageRating,
      totalReviews,
      ratingDistribution,
      reviews,
      userFeedback,
    });
  } catch (err) {
    console.error('getEventFeedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load event feedback.' });
  }
};

/**
 * POST /api/events/:id/feedback
 * Submit or update rating & feedback for an event (prevents duplicate feedback)
 */
const submitEventFeedback = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { rating, comment } = req.body;

    const user = req.user;
    const userId = user?._id?.toString() || user?.id?.toString() || req.body.userId;
    const userName = user?.name || req.body.userName || 'Community Member';
    const userEmail = user?.email || req.body.userEmail || '';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to submit event feedback.',
      });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be an integer between 1 and 5.',
      });
    }

    const cleanComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';

    if (isConnectedToMongoDB()) {
      try {
        const query = { eventId, userId };
        const existing = await Feedback.findOne(query);

        if (existing) {
          existing.rating = parsedRating;
          existing.comment = cleanComment;
          existing.userName = userName;
          existing.userEmail = userEmail;
          existing.updatedAt = new Date();
          await existing.save();

          return res.status(200).json({
            success: true,
            message: 'Feedback updated successfully.',
            isUpdate: true,
            feedback: existing,
          });
        }

        const newFeedback = await Feedback.create({
          eventId,
          userId,
          userName,
          userEmail,
          rating: parsedRating,
          comment: cleanComment,
          isVerifiedAttendee: true,
        });

        return res.status(201).json({
          success: true,
          message: 'Feedback submitted successfully.',
          isUpdate: false,
          feedback: newFeedback,
        });
      } catch (dbErr) {
        // Fallback to in-memory if DB save fails
        console.warn('MongoDB feedback save failed, falling back to in-memory store:', dbErr.message);
      }
    }

    // In-Memory store handling
    const existingIndex = (memoryFeedbacks || []).findIndex(
      (f) =>
        String(f.eventId) === String(eventId) &&
        (String(f.userId) === String(userId) || (userEmail && f.userEmail === userEmail))
    );

    if (existingIndex !== -1) {
      memoryFeedbacks[existingIndex].rating = parsedRating;
      memoryFeedbacks[existingIndex].comment = cleanComment;
      memoryFeedbacks[existingIndex].userName = userName;
      memoryFeedbacks[existingIndex].updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: 'Feedback updated successfully.',
        isUpdate: true,
        feedback: memoryFeedbacks[existingIndex],
      });
    }

    const newFeedback = {
      _id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      id: `fb-${Date.now()}`,
      eventId,
      userId,
      userName,
      userEmail,
      rating: parsedRating,
      comment: cleanComment,
      isVerifiedAttendee: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryFeedbacks.push(newFeedback);

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      isUpdate: false,
      feedback: newFeedback,
    });
  } catch (err) {
    console.error('submitEventFeedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit event feedback.' });
  }
};

/**
 * DELETE /api/events/:id/feedback
 * Remove user's feedback review for an event
 */
const deleteEventFeedback = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user?._id?.toString() || req.user?.id?.toString() || req.query.userId || req.body?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (isConnectedToMongoDB()) {
      try {
        await Feedback.deleteOne({ eventId, userId });
      } catch {
        // fallback
      }
    }

    const idx = (memoryFeedbacks || []).findIndex(
      (f) => String(f.eventId) === String(eventId) && String(f.userId) === String(userId)
    );
    if (idx !== -1) {
      memoryFeedbacks.splice(idx, 1);
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully.',
    });
  } catch (err) {
    console.error('deleteEventFeedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete feedback.' });
  }
};

module.exports = {
  getEventFeedback,
  submitEventFeedback,
  deleteEventFeedback,
};
