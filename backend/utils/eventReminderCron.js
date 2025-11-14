const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('../utils/emailService');

const { sendEventReminder } = emailService;

/**
 * Send event reminders to registered users
 * Runs every day at 9:00 AM
 * Sends reminders for events happening in the next 24 hours
 */
const sendEventReminders = async () => {
  try {
    console.log('🔔 Checking for upcoming events...');

    // Get events happening in the next 24 hours
    const [upcomingEvents] = await db.query(
      `SELECT e.event_id, e.title, e.event_date, e.location, e.is_online, e.meeting_link
       FROM events e
       WHERE e.event_date >= NOW()
         AND e.event_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
         AND e.is_active = TRUE`,
      []
    );

    if (upcomingEvents.length === 0) {
      console.log('✓ No upcoming events in the next 24 hours');
      return;
    }

    console.log(`📧 Found ${upcomingEvents.length} event(s) - sending reminders...`);

    for (const event of upcomingEvents) {
      // Get all registered attendees for this event
      const [attendees] = await db.query(
        `SELECT u.email, u.first_name, u.last_name
         FROM event_registrations er
         JOIN users u ON er.user_id = u.user_id
         WHERE er.event_id = ? 
           AND er.registration_status = 'registered'
           AND u.is_active = TRUE`,
        [event.event_id]
      );

      console.log(`  → Event: ${event.title} - ${attendees.length} attendee(s)`);

      // Send reminder to each attendee
      for (const attendee of attendees) {
        try {
          await sendEventReminder(
            attendee.email,
            `${attendee.first_name} ${attendee.last_name}`,
            {
              event_id: event.event_id,
              title: event.title,
              event_date: event.event_date,
              location: event.location,
              is_online: event.is_online,
              meeting_link: event.meeting_link
            }
          );
          console.log(`    ✓ Reminder sent to ${attendee.email}`);
        } catch (emailError) {
          console.error(`    ✗ Failed to send reminder to ${attendee.email}:`, emailError.message);
        }
      }
    }

    console.log('✓ Event reminders sent successfully');
  } catch (error) {
    console.error('❌ Error sending event reminders:', error);
  }
};

/**
 * Initialize cron job
 * Schedule: Every day at 9:00 AM
 */
const initEventReminderCron = () => {
  // Run every day at 9:00 AM (0 9 * * *)
  cron.schedule('0 9 * * *', async () => {
    console.log('📅 Running event reminder cron job...');
    await sendEventReminders();
  });

  console.log('✓ Event reminder cron job initialized (runs daily at 9:00 AM)');

  // Optional: Run immediately on startup for testing
  // Uncomment the line below to test on server start
  // sendEventReminders();
};

module.exports = { initEventReminderCron, sendEventReminders };