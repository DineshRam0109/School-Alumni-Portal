const db = require('../config/database');
const { createNotification } = require('./notificationController');
const emailService = require('../utils/emailService');

const { 
  sendEventRegistrationEmail, 
  sendEventCancellationEmail 
} = emailService;

// @desc    Create event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
  try {
    const {
      school_id,
      title,
      description,
      event_type,
      event_date,
      end_date,
      location,
      venue_details,
      is_online,
      meeting_link,
      max_attendees,
      registration_deadline,
      ticket_price
    } = req.body;

    // Validation
    if (!title || !event_date) {
      return res.status(400).json({
        success: false,
        message: 'Title and event date are required'
      });
    }

    // NEW: Validate description is required and has minimum length
    if (!description || description.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Event description is required and must be at least 20 characters'
      });
    }

    // Validate event date
    if (new Date(event_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past'
      });
    }

    // Validate location based on event type
    if (!is_online && !location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required for in-person events'
      });
    }

    if (is_online && !meeting_link) {
      return res.status(400).json({
        success: false,
        message: 'Meeting link is required for online events'
      });
    }

    const [result] = await db.query(
      `INSERT INTO events (school_id, created_by, created_by_type, title, description, event_type, 
                          event_date, end_date, location, venue_details, is_online, meeting_link, 
                          max_attendees, registration_deadline, ticket_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        school_id, 
        req.user.user_id, 
        req.user.role === 'school_admin' ? 'school_admin' : 'alumni',
        title, 
        description, 
        event_type || 'other', 
        event_date, 
        end_date, 
        location, 
        venue_details, 
        is_online || false, 
        meeting_link, 
        max_attendees, 
        registration_deadline, 
        ticket_price || 0
      ]
    );

    const eventId = result.insertId;

    // ADDED: Notify school admin when event is created
    if (req.user.role === 'alumni' && school_id) {
      try {
        // Get school admin ID
        const [schoolAdmin] = await db.query(
          'SELECT admin_id FROM school_admins WHERE school_id = ? AND is_active = TRUE LIMIT 1',
          [school_id]
        );

        if (schoolAdmin.length > 0) {
          await createNotification(
            schoolAdmin[0].admin_id,
            'event',
            'New Event Created',
            `${req.user.first_name} ${req.user.last_name} created a new event: ${title}`,
            eventId,
            'events'
          );
        }
      } catch (notifError) {
        console.error('Failed to send event creation notification:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event_id: eventId
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// @desc    Get all events with enhanced data
// @route   GET /api/events
// @access  Public (with restrictions)
exports.getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, school_id, event_type, upcoming, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, 
             s.school_name, 
             s.logo as school_logo,
             sa.admin_id,
             COUNT(DISTINCT er.registration_id) as registered_count
      FROM events e
      LEFT JOIN schools s ON e.school_id = s.school_id
      LEFT JOIN users u ON e.created_by = u.user_id AND e.created_by_type = 'alumni'
      LEFT JOIN school_admins sa ON e.created_by = sa.admin_id AND e.created_by_type = 'school_admin'
      LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.registration_status = 'registered'
      WHERE e.is_active = TRUE
    `;
    const params = [];

    // FIXED: Handle public access and authenticated users separately
    if (req.user) {
      // Authenticated users
      if (req.user.role === 'school_admin') {
        query += ` AND e.school_id = ?`;
        params.push(req.user.school_id);
      } else if (req.user.role === 'alumni' && school_id) {
        // Alumni can filter by any school
        query += ` AND e.school_id = ?`;
        params.push(school_id);
      } else if (req.user.role === 'super_admin' && school_id) {
        // Super admin can filter by school
        query += ` AND e.school_id = ?`;
        params.push(school_id);
      }
    } else {
      // Public access: allow school_id filter if provided
      if (school_id) {
        query += ` AND e.school_id = ?`;
        params.push(school_id);
      }
    }

    // Rest of the filtering logic remains the same...
    if (event_type) {
      query += ` AND e.event_type = ?`;
      params.push(event_type);
    }

    if (upcoming === 'true') {
      query += ` AND e.event_date >= NOW()`;
    } else if (upcoming === 'false') {
      query += ` AND e.event_date < NOW()`;
    }

    if (search) {
      query += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` GROUP BY e.event_id ORDER BY e.event_date ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rawEvents] = await db.query(query, params);

    // Transform events (existing code remains)
    const events = rawEvents.map(event => {
      let creator = {
        first_name: '',
        last_name: '',
        profile_picture: null
      };

      if (event.created_by_type === 'school_admin' && event.admin_id) {
        creator = {
          first_name: event.admin_first_name || 'School',
          last_name: event.admin_last_name || 'Admin',
          profile_picture: event.admin_profile_picture,
          role: 'school_admin'
        };
      } else if (event.created_by_type === 'alumni' && event.alumni_first_name) {
        creator = {
          first_name: event.alumni_first_name,
          last_name: event.alumni_last_name,
          profile_picture: event.alumni_profile_picture,
          role: 'alumni'
        };
      }

      return {
        ...event,
        creator_first_name: creator.first_name,
        creator_last_name: creator.last_name,
        creator_profile_picture: creator.profile_picture,
        creator_role: creator.role
      };
    });

    // FIXED: Count query with proper public/private handling
    let countQuery = `SELECT COUNT(DISTINCT e.event_id) as total FROM events e WHERE e.is_active = TRUE`;
    const countParams = [];

    if (req.user) {
      if (req.user.role === 'school_admin') {
        countQuery += ` AND e.school_id = ?`;
        countParams.push(req.user.school_id);
      } else if (req.user.role === 'alumni' && school_id) {
        countQuery += ` AND e.school_id = ?`;
        countParams.push(school_id);
      } else if (req.user.role === 'super_admin' && school_id) {
        countQuery += ` AND e.school_id = ?`;
        countParams.push(school_id);
      }
    } else if (school_id) {
      countQuery += ` AND e.school_id = ?`;
      countParams.push(school_id);
    }

    if (event_type) {
      countQuery += ` AND e.event_type = ?`;
      countParams.push(event_type);
    }

    if (upcoming === 'true') {
      countQuery += ` AND e.event_date >= NOW()`;
    } else if (upcoming === 'false') {
      countQuery += ` AND e.event_date < NOW()`;
    }

    if (search) {
      countQuery += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      events,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// @desc    Get event by ID with full details
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rawEvents] = await db.query(
      `SELECT e.*, 
              s.school_name, 
              s.logo as school_logo,
              u.email as alumni_email,
              sa.admin_id,
              sa.profile_picture as admin_profile_picture,
              COUNT(DISTINCT er.registration_id) as registered_count
       FROM events e
       LEFT JOIN schools s ON e.school_id = s.school_id
       LEFT JOIN users u ON e.created_by = u.user_id AND e.created_by_type = 'alumni'
       LEFT JOIN school_admins sa ON e.created_by = sa.admin_id AND e.created_by_type = 'school_admin'
       LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.registration_status = 'registered'
       WHERE e.event_id = ?
       GROUP BY e.event_id`,
      [id]
    );

    if (!rawEvents.length) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const rawEvent = rawEvents[0];
    let event = { ...rawEvent };

    // FIXED: Check if user is registered for this event
    let isUserRegistered = false;
    if (req.user) {
      const [userRegistration] = await db.query(
        `SELECT 1 FROM event_registrations 
         WHERE event_id = ? AND user_id = ? AND registration_status = 'registered'`,
        [id, req.user.user_id]
      );
      isUserRegistered = userRegistration.length > 0;
    }

    // FIXED: Hide meeting link if user is not registered and not admin
    const isAdmin = req.user && (req.user.role === 'school_admin' || req.user.role === 'super_admin');
    if (!isUserRegistered && !isAdmin && event.is_online) {
      event.meeting_link = null; // Hide meeting link from non-registered users
    }

    // Set creator information based on who created it
    if (rawEvent.created_by_type === 'school_admin' && rawEvent.admin_id) {
      event.creator_first_name = rawEvent.admin_first_name || 'School';
      event.creator_last_name = rawEvent.admin_last_name || 'Admin';
      event.creator_profile_picture = rawEvent.admin_profile_picture;
      event.creator_email = null; // Don't show admin email
      event.creator_role = 'school_admin';
    } else if (rawEvent.created_by_type === 'alumni' && rawEvent.alumni_first_name) {
      event.creator_first_name = rawEvent.alumni_first_name;
      event.creator_last_name = rawEvent.alumni_last_name;
      event.creator_profile_picture = rawEvent.alumni_profile_picture;
      event.creator_email = rawEvent.alumni_email;
      event.creator_role = 'alumni';
    }

    // Get registered users with full details
    const [registrations] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.profile_picture, 
              u.current_city, u.current_country, er.registered_at,
              we.company_name, we.position
       FROM event_registrations er
       JOIN users u ON er.user_id = u.user_id
       LEFT JOIN work_experience we ON u.user_id = we.user_id AND we.is_current = TRUE
       WHERE er.event_id = ? AND er.registration_status = 'registered'
       ORDER BY er.registered_at DESC`,
      [id]
    );

    event.registrations = registrations;

    // FIXED: Add registration status for the current user
    event.is_registered = isUserRegistered;
    event.is_admin = isAdmin;

    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // FIXED: Prevent ALL admins from registering
    if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot register for events. This feature is for alumni only.'
      });
    }

    // Check if event exists and get details including school_id
    const [events] = await db.query(
      `SELECT e.*, COUNT(er.registration_id) as current_registrations
       FROM events e
       LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.registration_status = 'registered'
       WHERE e.event_id = ? AND e.is_active = TRUE
       GROUP BY e.event_id`,
      [id]
    );

    if (!events.length) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = events[0];

    // Check if event has passed
    if (new Date(event.event_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if already registered
    const [existing] = await db.query(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (existing.length > 0 && existing[0].registration_status === 'registered') {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check max attendees
    if (event.max_attendees && event.current_registrations >= event.max_attendees) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Register user
    if (existing.length > 0) {
      await db.query(
        `UPDATE event_registrations 
         SET registration_status = 'registered', registered_at = NOW()
         WHERE event_id = ? AND user_id = ?`,
        [id, req.user.user_id]
      );
    } else {
      await db.query(
        `INSERT INTO event_registrations (event_id, user_id, payment_status, payment_amount)
         VALUES (?, ?, ?, ?)`,
        [id, req.user.user_id, event.ticket_price > 0 ? 'pending' : 'completed', event.ticket_price]
      );
    }

    // Send registration confirmation email
    try {
      await emailService.sendEventRegistrationEmail(
        req.user.email,
        `${req.user.first_name} ${req.user.last_name}`,
        {
          event_id: event.event_id,
          title: event.title,
          event_date: event.event_date,
          location: event.location,
          is_online: event.is_online,
          meeting_link: event.meeting_link,
          ticket_price: event.ticket_price
        }
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // UPDATED: Create notification based on who created the event
    try {
      if (event.created_by_type === 'alumni') {
        // Notify the alumni who created the event
        await createNotification(
          event.created_by,
          'event',
          'New Event Registration',
          `${req.user.first_name} ${req.user.last_name} registered for ${event.title}`,
          id,
          'event'
        );
      } else if (event.created_by_type === 'school_admin' && event.school_id) {
        // Notify the school admin who created the event
        const [schoolAdmin] = await db.query(
          'SELECT admin_id FROM school_admins WHERE school_id = ? AND is_active = TRUE LIMIT 1',
          [event.school_id]
        );

        if (schoolAdmin.length > 0) {
          await createNotification(
            schoolAdmin[0].admin_id,
            'event',
            'New Event Registration',
            `${req.user.first_name} ${req.user.last_name} registered for ${event.title}`,
            id,
            'events'
          );
        }
      }
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event'
    });
  } catch (error) {
    console.error('Register event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel event registration
// @route   DELETE /api/events/:id/cancel
// @access  Private
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const [registration] = await db.query(
      `SELECT er.*, e.title, e.event_date
       FROM event_registrations er
       JOIN events e ON er.event_id = e.event_id
       WHERE er.event_id = ? AND er.user_id = ? AND er.registration_status = "registered"`,
      [id, req.user.user_id]
    );

    if (!registration.length) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    await db.query(
      'UPDATE event_registrations SET registration_status = "cancelled" WHERE event_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    // Send cancellation email
    try {
      await sendEventCancellationEmail(
        req.user.email,
        `${req.user.first_name} ${req.user.last_name}`,
        {
          title: registration[0].title,
          event_date: registration[0].event_date
        }
      );
    } catch (emailError) {
      console.error('Cancellation email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get my events
// @route   GET /api/events/my/events
// @access  Private
exports.getMyEvents = async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    let query = `
      SELECT e.*, s.school_name, er.registered_at, er.registration_status,
             COUNT(DISTINCT er2.registration_id) as total_registered
      FROM event_registrations er
      JOIN events e ON er.event_id = e.event_id
      LEFT JOIN schools s ON e.school_id = s.school_id
      LEFT JOIN event_registrations er2 ON e.event_id = er2.event_id AND er2.registration_status = 'registered'
      WHERE er.user_id = ?
    `;
    const params = [req.user.user_id];

    if (status === 'upcoming') {
      query += ` AND e.event_date >= NOW() AND er.registration_status = 'registered'`;
    } else if (status === 'past') {
      query += ` AND e.event_date < NOW()`;
    }

    query += ` GROUP BY e.event_id ORDER BY e.event_date DESC`;

    const [events] = await db.query(query, params);

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registered events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Creator only)
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is the creator
    const [event] = await db.query(
      'SELECT created_by FROM events WHERE event_id = ?',
      [id]
    );

    if (!event.length) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event[0].created_by !== req.user.user_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    const updates = req.body;
    const allowedFields = [
      'title', 'description', 'event_type', 'event_date', 'end_date',
      'location', 'venue_details', 'is_online', 'meeting_link',
      'max_attendees', 'registration_deadline', 'ticket_price'
    ];

    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateValues.push(id);

    await db.query(
      `UPDATE events SET ${updateFields.join(', ')} WHERE event_id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Creator/Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const [event] = await db.query(
      'SELECT created_by FROM events WHERE event_id = ?',
      [id]
    );

    if (!event.length) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event[0].created_by !== req.user.user_id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE events SET is_active = FALSE WHERE event_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};