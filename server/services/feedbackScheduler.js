/**
 * feedbackScheduler.js
 * Schedules automated feedback requests:
 *  - Email 1 hour after event ends
 *  - Reminder email 24 hours later if not submitted
 *  - In-app prompt on next login
 */

const cron = require('node-cron');
const db = require('../db');
const { sendEmail } = require('./emailService');

/**
 * Schedule a feedback request for a single event.
 * Called when an event is created or updated.
 */
async function scheduleFeedbackForEvent(eventId) {
  const event = await db('events').where({ id: eventId }).first();
  if (!event) throw new Error(`Event ${eventId} not found`);

  const endTime = new Date(event.end_time);
  const firstEmailAt = new Date(endTime.getTime() + 60 * 60 * 1000); // +1 hour
  const reminderAt = new Date(endTime.getTime() + 25 * 60 * 60 * 1000); // +25 hours

  await db('feedback_schedule')
    .insert({
      event_id: eventId,
      first_email_at: firstEmailAt,
      reminder_at: reminderAt,
      first_sent: false,
      reminder_sent: false,
      created_at: new Date(),
    })
    .onConflict('event_id')
    .merge();

  console.log(
    `[FeedbackScheduler] Scheduled for event ${eventId}: first=${firstEmailAt.toISOString()}, reminder=${reminderAt.toISOString()}`
  );
}

/**
 * Send the initial feedback request to all attendees.
 */
async function sendFeedbackRequest(eventId) {
  const event = await db('events').where({ id: eventId }).first();
  if (!event) return;

  const attendees = await db('event_attendees')
    .where({ event_id: eventId })
    .join('users', 'event_attendees.user_id', 'users.id')
    .select('users.id', 'users.email', 'users.name');

  for (const attendee of attendees) {
    const alreadySubmitted = await db('feedback')
      .where({ event_id: eventId, user_id: attendee.id })
      .first();
    if (alreadySubmitted) continue;

    await sendEmail({
      to: attendee.email,
      subject: `How was "${event.title}"? Share your feedback ✨`,
      template: 'feedback-request',
      data: {
        name: attendee.name,
        eventTitle: event.title,
        feedbackUrl: `${process.env.APP_URL}/feedback/${eventId}`,
        xpReward: 25,
      },
    });

    // Set in-app prompt flag
    await db('user_notifications').insert({
      user_id: attendee.id,
      type: 'feedback_prompt',
      payload: JSON.stringify({ eventId, eventTitle: event.title }),
      created_at: new Date(),
    });
  }

  await db('feedback_schedule').where({ event_id: eventId }).update({ first_sent: true });
  console.log(
    `[FeedbackScheduler] Initial request sent for event ${eventId} to ${attendees.length} attendees`
  );
}

/**
 * Send reminder to attendees who haven't submitted yet.
 */
async function sendFeedbackReminder(eventId) {
  const event = await db('events').where({ id: eventId }).first();
  if (!event) return;

  const attendees = await db('event_attendees')
    .where({ event_id: eventId })
    .join('users', 'event_attendees.user_id', 'users.id')
    .select('users.id', 'users.email', 'users.name');

  const submitted = await db('feedback').where({ event_id: eventId }).pluck('user_id');
  const submittedSet = new Set(submitted);

  const pending = attendees.filter((a) => !submittedSet.has(a.id));

  for (const attendee of pending) {
    await sendEmail({
      to: attendee.email,
      subject: `Last chance: Your feedback on "${event.title}" matters 🙏`,
      template: 'feedback-reminder',
      data: {
        name: attendee.name,
        eventTitle: event.title,
        feedbackUrl: `${process.env.APP_URL}/feedback/${eventId}`,
        xpReward: 25,
      },
    });
  }

  await db('feedback_schedule').where({ event_id: eventId }).update({ reminder_sent: true });
  console.log(
    `[FeedbackScheduler] Reminder sent to ${pending.length} non-responders for event ${eventId}`
  );
}

/**
 * Cron job — runs every 5 minutes to process due feedback emails.
 */
function startScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    // Initial emails due
    const firstDue = await db('feedback_schedule')
      .where({ first_sent: false })
      .where('first_email_at', '<=', now);
    for (const row of firstDue) {
      await sendFeedbackRequest(row.event_id).catch(console.error);
    }

    // Reminders due
    const reminderDue = await db('feedback_schedule')
      .where({ first_sent: true, reminder_sent: false })
      .where('reminder_at', '<=', now);
    for (const row of reminderDue) {
      await sendFeedbackReminder(row.event_id).catch(console.error);
    }
  });

  console.log('[FeedbackScheduler] Cron started — checking every 5 minutes');
}

module.exports = {
  scheduleFeedbackForEvent,
  sendFeedbackRequest,
  sendFeedbackReminder,
  startScheduler,
};
