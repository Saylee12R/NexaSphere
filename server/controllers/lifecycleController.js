import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calculate lifecycle stage based on rules
const determineStage = (eventsAttended, lastActiveAt, createdAt) => {
  const daysSinceActive = (new Date() - new Date(lastActiveAt)) / (1000 * 60 * 60 * 24);
  const daysSinceSignup = (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24);

  if (daysSinceActive > 180) return 'CHURNED';
  if (daysSinceActive > 60) return 'INACTIVE';
  if (eventsAttended >= 10) return 'POWER_USER';
  if (eventsAttended >= 3) return 'ACTIVE';
  if (eventsAttended === 0 && daysSinceSignup <= 7) return 'NEW_USER';
  if (eventsAttended === 0 && daysSinceSignup > 7) return 'PROSPECT';

  return 'NEW_USER';
};

export const getUserLifecycle = async (req, res) => {
  try {
    const { userId } = req.params;
    const lifecycle = await prisma.userLifecycle.findUnique({
      where: { userId },
    });

    if (!lifecycle) {
      return res.status(404).json({ success: false, message: 'User lifecycle not found' });
    }

    res.json({ success: true, lifecycle });
  } catch (error) {
    console.error('Error fetching lifecycle:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const updateEventAttended = async (req, res) => {
  try {
    const { userId } = req.body;
    const lifecycle = await prisma.userLifecycle.findUnique({
      where: { userId },
    });

    if (!lifecycle) {
      return res.status(404).json({ success: false, message: 'User lifecycle not found' });
    }

    const newEventsAttended = lifecycle.eventsAttended + 1;
    const newStage = determineStage(newEventsAttended, new Date(), lifecycle.createdAt);

    const updated = await prisma.userLifecycle.update({
      where: { userId },
      data: {
        eventsAttended: newEventsAttended,
        lastActiveAt: new Date(),
        stage: newStage,
      },
    });

    // TODO: Trigger automated emails (e.g. Welcome email, recommend new events) based on newStage here.

    res.json({ success: true, lifecycle: updated });
  } catch (error) {
    console.error('Error updating event attended:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const getLifecycleAnalytics = async (req, res) => {
  try {
    const stats = await prisma.userLifecycle.groupBy({
      by: ['stage'],
      _count: { stage: true },
    });

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr.stage] = curr._count.stage;
      return acc;
    }, {});

    res.json({ success: true, stats: formattedStats });
  } catch (error) {
    console.error('Error fetching lifecycle analytics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
