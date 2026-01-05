const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email service error:', error);
  } else {
    console.log('✓ Email service ready');
  }
});

// ============================================
// EXISTING EMAILS (Already Implemented)
// ============================================

// Send verification email
exports.sendVerificationEmail = async (email, name, verificationUrl) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to AlumniHub - Alumni Portal, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #6B7280;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, name, resetUrl) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'AlumniHub - Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #6B7280;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send event registration confirmation
exports.sendEventRegistrationEmail = async (email, name, eventDetails) => {
  const { title, event_date, location, is_online, meeting_link, ticket_price } = eventDetails;
  
  const eventDate = new Date(event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const locationInfo = is_online 
    ? `<p><strong>Location:</strong> Online Event</p>${meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${meeting_link}">${meeting_link}</a></p>` : ''}`
    : `<p><strong>Location:</strong> ${location}</p>`;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Registration Confirmed: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">✓</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Registration Confirmed!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          <p style="color: #374151; font-size: 16px;">Thank you for registering for the event. We're excited to have you join us!</p>
          
          <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #1E40AF; margin-top: 0;">${title}</h3>
            <p style="color: #1E3A8A; margin: 8px 0;"><strong>📅 Date & Time:</strong> ${eventDate}</p>
            ${locationInfo}
            ${ticket_price > 0 ? `<p style="color: #1E3A8A; margin: 8px 0;"><strong>💳 Ticket Price:</strong> $${ticket_price}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/events/${eventDetails.event_id}" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Event Details
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send event cancellation email
exports.sendEventCancellationEmail = async (email, name, eventDetails) => {
  const { title, event_date } = eventDetails;
  
  const eventDate = new Date(event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'AlumniHub - Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Registration Cancelled: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2>Registration Cancelled</h2>
          <p>Hi ${name},</p>
          <p>Your registration for the following event has been successfully cancelled:</p>
          
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send event reminder
exports.sendEventReminder = async (email, name, eventDetails) => {
  const { title, event_date, location, is_online, meeting_link } = eventDetails;
  
  const eventDate = new Date(event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const locationInfo = is_online 
    ? `<p><strong>Location:</strong> Online Event</p>${meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${meeting_link}">${meeting_link}</a></p>` : ''}`
    : `<p><strong>Location:</strong> ${location}</p>`;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'AlumniHub - Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Reminder: ${title} - Tomorrow!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Event Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a friendly reminder that your event is coming up soon!</p>
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0;">
          <h3>${title}</h3>
          <p><strong>📅 Date & Time:</strong> ${eventDate}</p>
          ${locationInfo}
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// NEW EMAILS - CONNECTION SYSTEM
// ============================================

// 1. Connection Request Sent
exports.sendConnectionRequestEmail = async (email, receiverName, senderName, senderId) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🤝 New Connection Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #3B82F6; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🤝</span>
            </div>
            <h2 style="color: #111827; margin: 0;">New Connection Request</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${receiverName},</p>
          <p style="color: #374151; font-size: 16px;"><strong>${senderName}</strong> wants to connect with you on AlumniHub - Alumni Portal.</p>
          
          <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #1E40AF; margin: 0;">Building your professional network helps you discover new opportunities and stay connected with fellow alumni.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/connections" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
              View Request
            </a>
            <a href="${process.env.FRONTEND_URL}/profile/${senderId}" style="display: inline-block; padding: 12px 30px; background-color: #6B7280; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Profile
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 2. Connection Accepted
exports.sendConnectionAcceptedEmail = async (email, senderName, accepterName, accepterId) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'AlumniHub - Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '✅ Connection Request Accepted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎉</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Connection Accepted!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${senderName},</p>
          <p style="color: #374151; font-size: 16px;">Great news! <strong>${accepterName}</strong> accepted your connection request.</p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #065F46; margin: 0;">You are now connected! You can now message each other and collaborate more easily.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/profile/${accepterId}" style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
              View Profile
            </a>
            <a href="${process.env.FRONTEND_URL}/messages/${accepterId}" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Send Message
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// NEW EMAILS - MENTORSHIP SYSTEM
// ============================================

// 3. Mentorship Request Received
exports.sendMentorshipRequestEmail = async (email, mentorName, menteeName, menteeId, areaOfGuidance, mentorshipId) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🎓 New Mentorship Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #8B5CF6; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎓</span>
            </div>
            <h2 style="color: #111827; margin: 0;">New Mentorship Request</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${mentorName},</p>
          <p style="color: #374151; font-size: 16px;"><strong>${menteeName}</strong> has requested you to be their mentor.</p>
          
          <div style="background-color: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #5B21B6; margin: 0;"><strong>Area of Guidance:</strong></p>
            <p style="color: #5B21B6; margin: 5px 0 0 0;">${areaOfGuidance}</p>
          </div>
          
          <p style="color: #374151; font-size: 14px;">As a mentor, you can help shape someone's career and make a meaningful impact in their professional journey.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/mentorship/requests" style="display: inline-block; padding: 12px 30px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
              Review Request
            </a>
            <a href="${process.env.FRONTEND_URL}/profile/${menteeId}" style="display: inline-block; padding: 12px 30px; background-color: #6B7280; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Profile
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 4. Mentorship Accepted
exports.sendMentorshipAcceptedEmail = async (email, menteeName, mentorName, mentorId, mentorshipId) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🎉 Mentorship Request Accepted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎉</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Mentorship Accepted!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${menteeName},</p>
          <p style="color: #374151; font-size: 16px;">Excellent news! <strong>${mentorName}</strong> has accepted your mentorship request.</p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #065F46; margin: 0;">Your mentorship journey begins now! Start by scheduling your first session and setting goals together.</p>
          </div>
          
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              <strong>💡 Next Steps:</strong><br>
              1. Schedule your first session<br>
              2. Set clear goals<br>
              3. Prepare questions for your mentor
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/mentorship/${mentorshipId}" style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px;">
              View Mentorship
            </a>
            <a href="${process.env.FRONTEND_URL}/messages/${mentorId}" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Send Message
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 5. Mentorship Rejected
exports.sendMentorshipRejectedEmail = async (email, menteeName, mentorName) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Mentorship Request Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #111827;">Mentorship Request Update</h2>
          
          <p style="color: #374151; font-size: 16px;">Hi ${menteeName},</p>
          <p style="color: #374151; font-size: 16px;">Unfortunately, <strong>${mentorName}</strong> is unable to accept your mentorship request at this time.</p>
          
          <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #1E40AF; margin: 0;">Don't be discouraged! There are many other experienced alumni who would be happy to mentor you.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/search?tab=alumni" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Find Other Mentors
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 6. Mentorship Completed
exports.sendMentorshipCompletedEmail = async (email, userName, otherUserName, mentorshipId) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🏆 Mentorship Completed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #F59E0B; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🏆</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Mentorship Completed!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #374151; font-size: 16px;">Your mentorship with <strong>${otherUserName}</strong> has been marked as completed.</p>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #78350F; margin: 0;">Thank you for being part of our mentorship program! Your contribution makes a real difference in building our alumni community.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/mentorship" style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Mentorship History
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 7. Session Scheduled
exports.sendSessionScheduledEmail = async (email, userName, otherUserName, sessionDetails) => {
  const { session_title, scheduled_date, duration_minutes, meeting_link, session_description } = sessionDetails;
  
  const sessionDate = new Date(scheduled_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `📅 Mentorship Session Scheduled: ${session_title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #8B5CF6; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">📅</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Session Scheduled</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #374151; font-size: 16px;"><strong>${otherUserName}</strong> has scheduled a mentorship session with you.</p>
          
          <div style="background-color: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #5B21B6; margin-top: 0;">${session_title}</h3>
            <p style="color: #5B21B6; margin: 8px 0;"><strong>📅 Date & Time:</strong> ${sessionDate}</p>
            <p style="color: #5B21B6; margin: 8px 0;"><strong>⏱️ Duration:</strong> ${duration_minutes} minutes</p>
            ${meeting_link ? `<p style="color: #5B21B6; margin: 8px 0;"><strong>🔗 Meeting Link:</strong> <a href="${meeting_link}">${meeting_link}</a></p>` : ''}
            ${session_description ? `<p style="color: #5B21B6; margin: 8px 0;"><strong>📝 Description:</strong> ${session_description}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/mentorship/sessions" style="display: inline-block; padding: 12px 30px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Session Details
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// NEW EMAILS - VERIFICATION & ADMIN
// ============================================

// 8. Alumni Verification Approved
exports.sendAlumniVerificationApprovedEmail = async (email, alumniName, schoolName) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '✅ Your Education Has Been Verified',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">✅</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Education Verified!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${alumniName},</p>
          <p style="color: #374151; font-size: 16px;">Great news! Your education at <strong>${schoolName}</strong> has been verified by your school administrator.</p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #065F46; margin: 0;">Your profile is now complete and you have full access to all features of the Alumni Portal including:</p>
            <ul style="color: #065F46; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Connect with fellow alumni</li>
              <li>Access exclusive job opportunities</li>
              <li>Attend alumni events</li>
              <li>Join mentorship programs</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 9. New Alumni Registered (to School Admin)
exports.sendNewAlumniRegisteredEmail = async (email, adminName, alumniName, alumniEmail, schoolName) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🎓 New Alumni Registration - Verification Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #6366F1; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎓</span>
            </div>
            <h2 style="color: #111827; margin: 0;">New Alumni Registration</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${adminName},</p>
          <p style="color: #374151; font-size: 16px;">A new alumni has registered for <strong>${schoolName}</strong> and is awaiting verification.</p>
          
          <div style="background-color: #EEF2FF; border-left: 4px solid #6366F1; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #4338CA; margin: 0;"><strong>Alumni Details:</strong></p>
            <p style="color: #4338CA; margin: 8px 0 0 0;"><strong>Name:</strong> ${alumniName}</p>
            <p style="color: #4338CA; margin: 5px 0 0 0;"><strong>Email:</strong> ${alumniEmail}</p>
          </div>
          
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              <strong>⚠️ Action Required:</strong> Please review and verify this alumni's education record to grant them full access to the platform.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/school-admin/unverified-alumni" style="display: inline-block; padding: 12px 30px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Review & Verify
            </a>
          </div>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// NEW EMAILS - SECURITY
// ============================================

// 10. Password Changed Successfully
exports.sendPasswordChangedEmail = async (email, userName) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🔒 Password Changed Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10B981; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🔒</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Password Changed Successfully</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #374151; font-size: 16px;">Your password has been successfully changed.</p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #065F46; margin: 0;">If you made this change, no further action is required. Your account is secure.</p>
          </div>
          
          <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #991B1B; margin: 0;">
              <strong>⚠️ Didn't make this change?</strong><br>
              If you didn't change your password, please contact us immediately at <a href="mailto:${process.env.SUPPORT_EMAIL || 'dineshram0109@gmail.com'}" style="color: #991B1B;">${process.env.SUPPORT_EMAIL || 'support@alumnihub.com'}</a>
            </p>
          </div>
          
        
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// NEW EMAILS - JOB SYSTEM (DAILY DIGEST)
// ============================================

// 11. Daily New Jobs Digest
exports.sendDailyJobsDigestEmail = async (email, userName, jobs) => {
  if (!jobs || jobs.length === 0) return;

  const jobsHtml = jobs.map(job => `
    <div style="background-color: #F9FAFB; border-left: 4px solid #3B82F6; padding: 15px; margin: 15px 0; border-radius: 4px;">
      <h3 style="color: #1F2937; margin: 0 0 8px 0;">${job.job_title}</h3>
      <p style="color: #4B5563; margin: 5px 0;"><strong>Company:</strong> ${job.company_name}</p>
      ${job.location ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Location:</strong> ${job.location}</p>` : ''}
      ${job.job_type ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Type:</strong> ${job.job_type}</p>` : ''}
      ${job.experience_level ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Experience:</strong> ${job.experience_level}</p>` : ''}
      <a href="${process.env.FRONTEND_URL}/jobs/${job.job_id}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
        View Details
      </a>
    </div>
  `).join('');

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `💼 ${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Posted Today`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #3B82F6; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">💼</span>
            </div>
            <h2 style="color: #111827; margin: 0;">New Job Opportunities</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #374151; font-size: 16px;"><strong>${jobs.length}</strong> new job${jobs.length > 1 ? 's have' : ' has'} been posted on Alumni Portal today!</p>
          
          ${jobsHtml}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <a href="${process.env.FRONTEND_URL}/jobs" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View All Jobs
            </a>
          </div>
          
          
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendDailyEventsDigestEmail = async (email, userName, events) => {
  if (!events || events.length === 0) return;

  const eventsHtml = events.map(event => `
    <div style="background-color: #FFF7ED; border-left: 4px solid #EA580C; padding: 15px; margin: 15px 0; border-radius: 4px;">
      <h3 style="color: #1F2937; margin: 0 0 8px 0;">${event.title}</h3>
      <p style="color: #4B5563; margin: 5px 0;"><strong>Type:</strong> ${event.event_type || 'General'}</p>
      <p style="color: #4B5563; margin: 5px 0;"><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })}</p>
      ${event.location ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
      ${event.is_online ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Format:</strong> Online Event</p>` : ''}
      <a href="${process.env.FRONTEND_URL}/events/${event.event_id}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background-color: #EA580C; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
        View Details
      </a>
    </div>
  `).join('');

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `🎉 ${events.length} New Event${events.length > 1 ? 's' : ''} Posted Today`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #EA580C; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎉</span>
            </div>
            <h2 style="color: #111827; margin: 0;">New Events Available</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #374151; font-size: 16px;"><strong>${events.length}</strong> new event${events.length > 1 ? 's have' : ' has'} been posted on Alumni Portal today!</p>
          
          ${eventsHtml}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <a href="${process.env.FRONTEND_URL}/events" style="display: inline-block; padding: 12px 30px; background-color: #EA580C; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View All Events
            </a>
          </div>
       
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};


exports.sendSchoolAdminAssignmentEmail = async (email, adminName, schoolName, loginUrl) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: '🎓 You Have Been Assigned as School Administrator',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #6366F1; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🎓</span>
            </div>
            <h2 style="color: #111827; margin: 0;">School Administrator Role Assigned</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${adminName},</p>
          <p style="color: #374151; font-size: 16px;">Congratulations! You have been assigned as a <strong>School Administrator</strong> for:</p>
          
          <div style="background-color: #EEF2FF; border-left: 4px solid #6366F1; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #4338CA; margin: 0;">${schoolName}</h3>
          </div>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #065F46; margin: 0;"><strong>Your Responsibilities Include:</strong></p>
            <ul style="color: #065F46; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Verify alumni education records</li>
              <li>Manage school events</li>
              <li>Post job opportunities for alumni</li>
              <li>View school analytics and reports</li>
              <li>Communicate with alumni network</li>
            </ul>
          </div>
          
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              <strong>💡 Next Steps:</strong><br>
              1. Log in to the school admin portal<br>
              2. Review pending alumni verification requests<br>
              3. Familiarize yourself with the dashboard<br>
              4. Start engaging with your alumni community
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${loginUrl || process.env.FRONTEND_URL + '/school-admin-login'}" style="display: inline-block; padding: 12px 30px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Access School Admin Portal
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 12px; text-align: center; margin-top: 30px;">
            If you have any questions or need assistance, please contact our support team at 
            <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@alumnihub.com'}" style="color: #6366F1;">${process.env.SUPPORT_EMAIL || 'support@alumnihub.com'}</a>
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};