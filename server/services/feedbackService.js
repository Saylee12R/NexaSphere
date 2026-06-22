import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const feedbackService = {
  async submitFeedback(data) {
    // Simple mock of sentiment analysis
    let sentiment = 'neutral';
    if (data.suggestions || data.bestParts) {
      const text = `${data.suggestions} ${data.bestParts}`.toLowerCase();
      if (text.includes('great') || text.includes('awesome') || text.includes('excellent')) {
        sentiment = 'positive';
      } else if (text.includes('bad') || text.includes('poor') || text.includes('worst')) {
        sentiment = 'negative';
      }
    }

    return prisma.eventFeedback.create({
      data: {
        eventId: data.eventId,
        userId: data.userId || null,
        ratingOverall: data.ratingOverall,
        wouldAttendAgain: data.wouldAttendAgain,
        recommendFriend: data.recommendFriend,
        ratingVenue: data.ratingVenue,
        ratingContent: data.ratingContent,
        ratingSpeaker: data.ratingSpeaker,
        ratingPace: data.ratingPace,
        suggestions: data.suggestions,
        bestParts: data.bestParts,
        sentiment: sentiment,
      },
    });
  },

  async getFeedbackAnalytics(eventId) {
    const feedbacks = await prisma.eventFeedback.findMany({
      where: { eventId },
    });

    if (feedbacks.length === 0) {
      return {
        totalResponses: 0,
        averageRating: 0,
        sentiments: { positive: 0, neutral: 0, negative: 0 },
      };
    }

    const totalResponses = feedbacks.length;
    const sumRatings = feedbacks.reduce((acc, curr) => acc + curr.ratingOverall, 0);
    const averageRating = sumRatings / totalResponses;

    const sentiments = feedbacks.reduce(
      (acc, curr) => {
        acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    return {
      totalResponses,
      averageRating: parseFloat(averageRating.toFixed(2)),
      sentiments,
    };
  },

  async getFeedbacks(eventId) {
    return prisma.eventFeedback.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });
  },

  async createActionItem(data) {
    return prisma.actionItem.create({
      data: {
        title: data.title,
        description: data.description,
        eventId: data.eventId,
        assigneeId: data.assigneeId || null,
        status: data.status || 'pending',
      },
    });
  },

  async getActionItems(eventId) {
    return prisma.actionItem.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          select: { name: true, email: true },
        },
      },
    });
  },
};
