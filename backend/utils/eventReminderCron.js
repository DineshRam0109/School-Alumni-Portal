const cron = require('node-cron');
const db = require('../config/database');
const emailService = require('../utils/emailService');

const { sendEventReminder } = emailService;

/**
 * Send event reminders to registered users
 * Runs every day at 9:00 AM
 * Sends reminders for events happening in the next 24 hours
 */

const sendDailyJobsDigest = async () => {
  try {
    console.log('💼 Checking for new jobs posted today...');

    // Get jobs posted in the last 24 hours
    const [newJobs] = await db.query(
      `SELECT j.job_id, j.job_title, j.company_name, j.location, j.job_type, 
              j.experience_level, j.salary_range, j.application_url
       FROM jobs j
       WHERE j.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND j.is_active = TRUE
       ORDER BY j.created_at DESC
       LIMIT 10`,
      []
    );

    if (newJobs.length === 0) {
      console.log('✓ No new jobs posted today');
      return;
    }

    console.log(`📧 Found ${newJobs.length} new job(s) - sending digest...`);

    // Get all active alumni who want job notifications
    const [alumni] = await db.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name
       FROM users u
       WHERE u.role = 'alumni' 
         AND u.is_active = TRUE
         AND u.email IS NOT NULL`,
      []
    );

    console.log(`  → Sending to ${alumni.length} alumni`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of alumni) {
      try {
        await sendDailyJobsDigestEmail(
          user.email,
          `${user.first_name} ${user.last_name}`,
          newJobs
        );
        successCount++;
      } catch (emailError) {
        errorCount++;
        console.error(`    ✗ Failed to send digest to ${user.email}:`, emailError.message);
      }
    }

    console.log(`✓ Job digest sent: ${successCount} successful, ${errorCount} failed`);
  } catch (error) {
    console.error('✖ Error sending job digest:', error);
  }
};

// ============================================
// NEW: DAILY EVENT DIGEST (All active alumni)
// ============================================
const sendDailyEventsDigest = async () => {
  try {
    console.log('🎉 Checking for new events posted today...');

    // Get events posted in the last 24 hours
    const [newEvents] = await db.query(
      `SELECT e.event_id, e.title, e.description, e.event_type, e.event_date, 
              e.location, e.is_online, e.meeting_link, e.ticket_price,
              s.school_name
       FROM events e
       LEFT JOIN schools s ON e.school_id = s.school_id
       WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND e.is_active = TRUE
         AND e.event_date >= NOW()
       ORDER BY e.event_date ASC
       LIMIT 10`,
      []
    );

    if (newEvents.length === 0) {
      console.log('✓ No new events posted today');
      return;
    }

    console.log(`📧 Found ${newEvents.length} new event(s) - sending digest...`);

    // Get all active alumni
    const [alumni] = await db.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name
       FROM users u
       WHERE u.role = 'alumni' 
         AND u.is_active = TRUE
         AND u.email IS NOT NULL`,
      []
    );

    console.log(`  → Sending to ${alumni.length} alumni`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of alumni) {
      try {
        await sendDailyEventsDigestEmail(
          user.email,
          `${user.first_name} ${user.last_name}`,
          newEvents
        );
        successCount++;
      } catch (emailError) {
        errorCount++;
        console.error(`    ✗ Failed to send digest to ${user.email}:`, emailError.message);
      }
    }

    console.log(`✓ Event digest sent: ${successCount} successful, ${errorCount} failed`);
  } catch (error) {
    console.error('✖ Error sending event digest:', error);
  }
};

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
  // 1. Event Reminders: Every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('📅 Running event reminder cron job...');
    await sendEventReminders();
  });
  console.log('✓ Event reminder cron job initialized (runs daily at 9:00 AM)');

  // 2. Daily Job Digest: Every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('💼 Running daily job digest cron job...');
    await sendDailyJobsDigest();
  });
  console.log('✓ Daily job digest cron job initialized (runs daily at 10:00 AM)');

  // 3. Daily Event Digest: Every day at 11:00 AM
  cron.schedule('0 11 * * *', async () => {
    console.log('🎉 Running daily event digest cron job...');
    await sendDailyEventsDigest();
  });
  console.log('✓ Daily event digest cron job initialized (runs daily at 11:00 AM)');

  // 4. Daily Mentorship Digest: Every day at 2:00 PM
  cron.schedule('0 14 * * *', async () => {
    console.log('🎓 Running daily mentorship digest cron job...');
    await sendDailyMentorshipDigest();
  });
  console.log('✓ Daily mentorship digest cron job initialized (runs daily at 2:00 PM)');

  
};

module.exports = { 
  initEventReminderCron, 
  sendEventReminders,
  sendDailyJobsDigest,
  sendDailyEventsDigest,
};