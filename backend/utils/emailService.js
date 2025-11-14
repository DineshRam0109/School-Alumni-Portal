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

// Send verification email
exports.sendVerificationEmail = async (email, name, verificationUrl) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Alumni Portal, ${name}!</h2>
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
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
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
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send connection notification
exports.sendConnectionNotification = async (email, name, senderName) => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'New Connection Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Connection Request</h2>
        <p>Hi ${name},</p>
        <p><strong>${senderName}</strong> sent you a connection request on Alumni Portal.</p>
        <a href="${process.env.FRONTEND_URL}/connections" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          View Request
        </a>
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
          
          <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              <strong>📌 Important:</strong> We'll send you a reminder before the event. ${is_online && meeting_link ? 'Use the meeting link above to join the event.' : 'Make sure to arrive on time!'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/events/${eventDetails.event_id}" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Event Details
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">
            If you have any questions, please contact the event organizer.<br>
            <a href="${process.env.FRONTEND_URL}" style="color: #3B82F6; text-decoration: none;">Visit Alumni Portal</a>
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send event reminder (1 day before)
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
    ? `<p><strong>Location:</strong> Online Event</p>${meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${meeting_link}" style="color: #3B82F6; font-weight: 600;">${meeting_link}</a></p>` : ''}`
    : `<p><strong>Location:</strong> ${location}</p>`;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Reminder: ${title} - Tomorrow!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="background-color: #F59E0B; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">🔔</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Event Reminder</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          <p style="color: #374151; font-size: 16px;">This is a friendly reminder that your event is coming up soon!</p>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #92400E; margin-top: 0;">${title}</h3>
            <p style="color: #78350F; margin: 8px 0;"><strong>📅 Date & Time:</strong> ${eventDate}</p>
            ${locationInfo}
          </div>
          
          <div style="background-color: #DBEAFE; border: 1px solid #93C5FD; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #1E40AF; margin: 0; font-size: 14px;">
              <strong>⏰ Don't forget!</strong> The event starts tomorrow. ${is_online ? 'Make sure to test your internet connection and audio/video before joining.' : 'Plan your travel accordingly and arrive a few minutes early.'}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/events/${eventDetails.event_id}" style="display: inline-block; padding: 12px 30px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Event Details
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">
            See you at the event!<br>
            <a href="${process.env.FRONTEND_URL}" style="color: #3B82F6; text-decoration: none;">Alumni Portal</a>
          </p>
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
    from: `"${process.env.APP_NAME || 'Alumni Portal'}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Registration Cancelled: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="background-color: #6B7280; color: white; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">✕</span>
            </div>
            <h2 style="color: #111827; margin: 0;">Registration Cancelled</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          <p style="color: #374151; font-size: 16px;">Your registration for the following event has been successfully cancelled:</p>
          
          <div style="background-color: #F3F4F6; border-left: 4px solid #6B7280; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #374151; margin-top: 0;">${title}</h3>
            <p style="color: #4B5563; margin: 8px 0;"><strong>📅 Was scheduled for:</strong> ${eventDate}</p>
          </div>
          
          <p style="color: #374151; font-size: 16px;">We're sorry you can't make it. If you change your mind, you can register again anytime before the event.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/events" style="display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Browse More Events
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">
            Thank you for using Alumni Portal<br>
            <a href="${process.env.FRONTEND_URL}" style="color: #3B82F6; text-decoration: none;">Visit Alumni Portal</a>
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};