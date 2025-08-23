// Google Apps Script for mechanic booking system

// Updated doPost function with calendar integration
function doPost(e) {
  try {
    console.log('doPost called with parameter:', e.parameter);
    
    // Get the active sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    console.log('Sheet name:', sheet.getName());
    
    // Get data from form parameters (not JSON)
    const data = e.parameter;
    console.log('Form data received:', data);
    
    // Check if slot is already booked
    const existingBookings = getBookedSlots();
    console.log('Existing bookings:', existingBookings.length);
    
    const isSlotTaken = existingBookings.some(booking => 
      booking.date === data.date && booking.time === data.time
    );
    
    if (isSlotTaken) {
      console.log('Slot already taken:', data.date, data.time);
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Slot already booked' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Prepare row data - make sure all fields exist
    // IMPORTANT: Prefix phone number with apostrophe to force text format
    const rowData = [
      data.name || '',
      "'" + (data.phone || ''), // Force text format with apostrophe
      data.email || '',
      data.date || '',
      data.time || '',
      data.address || '',
      data.apartment || '',
      data.city || '',
      data.directions || '',
      data.appliance || '',
      data.details || '',
      'Pending',  // Status
      new Date()  // Timestamp
    ];
    
    console.log('Adding row data:', rowData);
    
    // Add new booking to sheet
    sheet.appendRow(rowData);
    console.log('Row added successfully');
    
    // CREATE CALENDAR EVENT - This was missing!
    try {
      createCalendarEvent(data);
      console.log('Calendar event created successfully');
    } catch (calendarError) {
      console.error('Calendar event creation failed:', calendarError);
      // Don't fail the booking if calendar fails, but log the error
    }
    
    // Send email notification to admin
    try {
      sendBookingEmail(data);
      console.log('Admin email sent successfully');
    } catch (emailError) {
      console.error('Admin email failed:', emailError);
      // Continue even if email fails
    }
    
    // Send confirmation email to customer if email provided
    if (data.email && data.email.trim() !== '') {
      try {
        sendCustomerConfirmationEmail(data);
        console.log('Customer confirmation email sent successfully');
      } catch (emailError) {
        console.error('Customer email failed:', emailError);
        // Don't fail the whole booking if customer email fails
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    console.error('Error stack:', error.stack);
    
    // Still try to send email even if sheet fails
    try {
      sendBookingEmail(e.parameter);
      console.log('Email sent despite sheet error');
    } catch (emailError) {
      console.error('Email also failed:', emailError);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: 'Server error: ' + error.toString(),
        success: false 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function createCalendarEvent(data) {
  try {
    // Configuration - UPDATE THESE VALUES
    const CALENDAR_EMAIL = 'werbenhs@gmail.com'; // Change this to the email that should receive calendar events
    const TIMEZONE = 'Europe/Sofia'; // Bulgaria timezone
    
    // Parse the booking date and time
    const bookingDate = new Date(data.date + 'T00:00:00');
    const timeRange = data.time.split('-'); // e.g., "09:00-11:00"
    const startTime = timeRange[0]; // "09:00"
    const endTime = timeRange[1]; // "11:00"
    
    // Create start and end datetime objects
    const startDateTime = new Date(data.date + 'T' + startTime + ':00');
    const endDateTime = new Date(data.date + 'T' + endTime + ':00');
    
    console.log('Creating calendar event for:', startDateTime, 'to', endDateTime);
    
    // Event title
    const eventTitle = `Ремонт ${data.appliance} - ${data.name}`;
    
    // Event description
    const description = `
НОВА ЗАЯВКА ЗА РЕМОНТ

Клиент: ${data.name}
Телефон: ${data.phone}
${data.email ? `Имейл: ${data.email}` : ''}

Адрес: ${data.address}${data.apartment ? ', ' + data.apartment : ''}
Град: ${data.city}
${data.directions ? `Инструкции: ${data.directions}` : ''}

Уред: ${data.appliance}
${data.details ? `Описание: ${data.details}` : ''}

Статус: Изчаква потвърждение
Диагностика: 30 лв (15,32 €)

Това събитие е създадено автоматично от системата за запазване на rotorem.bg
    `.trim();
    
    // Get the calendar (either default calendar or specific calendar by email)
    let calendar;
    
    try {
      // Try to get calendar by email first (if it's a shared calendar)
      if (CALENDAR_EMAIL !== Session.getActiveUser().getEmail()) {
        calendar = CalendarApp.getCalendarById(CALENDAR_EMAIL);
      } else {
        // Use default calendar
        calendar = CalendarApp.getDefaultCalendar();
      }
    } catch (e) {
      console.log('Could not access calendar by email, using default calendar');
      calendar = CalendarApp.getDefaultCalendar();
    }
    
    if (!calendar) {
      throw new Error('Could not access calendar');
    }
    
    // Create the event
    const event = calendar.createEvent(
      eventTitle,
      startDateTime,
      endDateTime,
      {
        description: description,
        location: `${data.address}${data.apartment ? ', ' + data.apartment : ''}, ${data.city}`,
        guests: data.email ? [data.email] : [], // Add customer email as guest if provided
        sendInvites: false // Set to true if you want to send calendar invites to guests
      }
    );
    
    // Set event color (optional) - colors: 1-11
    // 1: Blue, 2: Green, 3: Purple, 4: Red, 5: Yellow, 6: Orange, 7: Turquoise, 8: Gray, 9: Bold Blue, 10: Bold Green, 11: Bold Red
    try {
      event.setColor(CalendarApp.EventColor.ORANGE); // Orange for pending bookings
    } catch (colorError) {
      console.log('Could not set event color:', colorError);
    }
    
    // Add reminders
    try {
      event.removeAllReminders();
      event.addPopupReminder(60); // 1 hour before
      event.addPopupReminder(15); // 15 minutes before
    } catch (reminderError) {
      console.log('Could not set reminders:', reminderError);
    }
    
    console.log('Calendar event created:', event.getId());
    return event;
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

function doGet(e) {
  try {
    console.log('doGet called with parameters:', e.parameter);
    
    const action = e.parameter.action;
    const bookingId = e.parameter.bookingId;
    const date = e.parameter.date;
    const time = e.parameter.time;
    const redirect = e.parameter.redirect;
    const deleteBooking = e.parameter.delete;
    const callback = e.parameter.callback;
    
    // Handle form submission via JSONP (when name parameter exists)
    if (e.parameter.name && callback) {
      console.log('Processing booking form submission via JSONP');
      
      try {
        // Process the booking like in doPost
        const data = e.parameter;
        console.log('Form data received via GET:', data);
        
        // Check if slot is already booked
        const existingBookings = getBookedSlots();
        console.log('Existing bookings:', existingBookings.length);
        
        const isSlotTaken = existingBookings.some(booking => 
          booking.date === data.date && booking.time === data.time
        );
        
        if (isSlotTaken) {
          console.log('Slot already taken:', data.date, data.time);
          const errorResponse = JSON.stringify({ 
            success: false, 
            error: 'Slot already booked' 
          });
          return ContentService
            .createTextOutput(`${callback}(${errorResponse})`)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        
        // Get the active sheet
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getActiveSheet();
        
        // Prepare row data - make sure all fields exist
        const rowData = [
          data.name || '',
          "'" + (data.phone || ''), // Force text format with apostrophe
          data.email || '',
          data.date || '',
          data.time || '',
          data.address || '',
          data.apartment || '',
          data.city || '',
          data.directions || '',
          data.appliance || '',
          data.details || '',
          'Pending',  // Status
          new Date()  // Timestamp
        ];
        
        console.log('Adding row data:', rowData);
        
        // Add new booking to sheet
        sheet.appendRow(rowData);
        console.log('Row added successfully');
        
        // CREATE CALENDAR EVENT - This is the important addition!
        try {
          const calendarEvent = createCalendarEvent(data);
          console.log('Calendar event created successfully:', calendarEvent ? calendarEvent.getId() : 'Event created');
        } catch (calendarError) {
          console.error('Calendar event creation failed:', calendarError);
          console.error('Calendar error details:', calendarError.toString());
          // Don't fail the booking if calendar fails, but log the error
        }
        
        // Send email notification to admin
        try {
          sendBookingEmail(data);
          console.log('Admin email sent successfully');
        } catch (emailError) {
          console.error('Admin email failed:', emailError);
          // Continue with booking even if email fails
        }
        
        // Send confirmation email to customer if email provided
        if (data.email && data.email.trim() !== '') {
          try {
            sendCustomerConfirmationEmail(data);
            console.log('Customer confirmation email sent successfully');
          } catch (emailError) {
            console.error('Customer email failed:', emailError);
            // Don't fail the whole booking if customer email fails
          }
        }
        
        const successResponse = JSON.stringify({ success: true });
        return ContentService
          .createTextOutput(`${callback}(${successResponse})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
          
      } catch (error) {
        console.error('Error processing booking via JSONP:', error);
        console.error('Error stack:', error.stack);
        
        // Still try to send email even if sheet fails
        try {
          sendBookingEmail(e.parameter);
          console.log('Email sent despite sheet error');
        } catch (emailError) {
          console.error('Email also failed:', emailError);
        }
        
        const errorResponse = JSON.stringify({ 
          success: false, 
          error: 'Server error: ' + error.toString()
        });
        return ContentService
          .createTextOutput(`${callback}(${errorResponse})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
    }
    
    // Handle admin page request
    if (e.parameter.admin === 'true') {
      return createMobileAdminPage();
    }
    
    // Handle AJAX calendar data request
    if (e.parameter.ajax === 'calendar') {
      const month = parseInt(e.parameter.month || new Date().getMonth());
      const year = parseInt(e.parameter.year || new Date().getFullYear());
      return getCalendarData(month, year);
    }
    
    // Handle AJAX booking details request
    if (e.parameter.ajax === 'bookingDetails') {
      return getBookingDetails(date);
    }
    
    // Handle delete booking action
    if (deleteBooking === 'true') {
      return handleDeleteBooking(date, time, redirect);
    }
    
    // Handle confirm/cancel actions
    if (action === 'confirm' || action === 'cancel') {
      return handleBookingAction(action, bookingId, date, time, redirect);
    }
    
    // Default: return booked slots for availability checking
    const bookedSlots = getBookedSlots();
    console.log('Returning booked slots:', bookedSlots.length);
    
    // Support JSONP callback for CORS-free requests
    const jsonData = JSON.stringify(bookedSlots);
    
    if (callback) {
      // JSONP response
      return ContentService
        .createTextOutput(`${callback}(${jsonData})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Regular JSON response
      return ContentService
        .createTextOutput(jsonData)
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    
    const callback = e.parameter.callback;
    const errorData = JSON.stringify({ success: false, error: error.toString() });
    
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${errorData})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(errorData)
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    }
  }
}

function getBookedSlots() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    console.log('Sheet has', data.length, 'rows');
    
    // Skip header row and filter confirmed/pending bookings
    const bookedSlots = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[11]; // Status column (L)
      const rawDate = row[3]; // Date column (D)
      const time = row[4]; // Time column (E)
      
      console.log(`Processing row ${i}: rawDate=${rawDate} (type: ${typeof rawDate}), time=${time}, status=${status}`);
      
      if (status && status !== 'Cancelled') {
        const formattedDate = formatDate(rawDate);
        
        console.log(`Row ${i}: rawDate="${rawDate}" formatted to "${formattedDate}"`);
        
        if (formattedDate && time) {
          const slot = {
            date: formattedDate,
            time: time.toString()
          };
          bookedSlots.push(slot);
          console.log(`Added booked slot: ${slot.date} at ${slot.time}`);
        }
      }
    }
    
    console.log('Final booked slots:', bookedSlots.length);
    bookedSlots.forEach((slot, index) => {
      console.log(`Final slot ${index + 1}: date="${slot.date}", time="${slot.time}"`);
    });
    
    return bookedSlots;
  } catch (error) {
    console.error('Error in getBookedSlots:', error);
    return [];
  }
}

function formatDate(date) {
  if (!date) return '';
  
  // Handle different date formats
  if (date instanceof Date) {
    // Use local date methods to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's already a string in YYYY-MM-DD format
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date;
  }
  
  // Try to parse and format using local time
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      // Use local date methods to avoid timezone conversion
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Error parsing date:', date, e);
  }
  
  return date.toString();
}

// Get all bookings data for admin interface
function getAllBookings() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    // Get all bookings
    const allBookings = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const booking = {
        name: row[0] || '',
        phone: (row[1] || '').toString().replace(/^'/, ''), // Remove apostrophe prefix if present
        email: row[2] || '',
        date: formatDate(row[3]) || '',
        time: row[4] || '',
        address: row[5] || '',
        apartment: row[6] || '',
        city: row[7] || '',
        directions: row[8] || '',
        appliance: row[9] || '',
        details: row[10] || '',
        status: row[11] || 'Pending',
        timestamp: row[12] || '',
        rowIndex: i + 1
      };
      
      if (booking.date) {
        allBookings.push(booking);
      }
    }
    
    return allBookings;
  } catch (error) {
    console.error('Error getting all bookings:', error);
    return [];
  }
}

// New function to send confirmation email to customer
function sendCustomerConfirmationEmail(data) {
  try {
    const subject = 'Заявката ви е получена - РотоРем Варна';
    const recipient = data.email;
    
    // Format date for display
    const dateObj = new Date(data.date + 'T00:00:00');
    const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
    const monthNames = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
    
    const formattedDate = `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Потвърждение на заявка</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">ЗАЯВКАТА ВИ Е ПОЛУЧЕНА</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">РотоРем Варна - Професионален ремонт</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">
              Здравейте, <strong>${data.name}</strong>!
            </p>
            
            <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">
              Получихме вашата заявка за ремонт. Ще се свържем с вас скоро за потвърждение на часа.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Детайли на заявката:</h2>
              
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Дата:</strong></td>
                  <td style="padding: 8px 0; color: #374151;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Час:</strong></td>
                  <td style="padding: 8px 0; color: #374151;">${data.time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Адрес:</strong></td>
                  <td style="padding: 8px 0; color: #374151;">${data.address}${data.apartment ? ', ' + data.apartment : ''}, ${data.city}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Уред:</strong></td>
                  <td style="padding: 8px 0; color: #374151;">${data.appliance}</td>
                </tr>
                ${data.details ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;"><strong>Описание:</strong></td>
                  <td style="padding: 8px 0; color: #374151;">${data.details}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Important notice -->
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">
                &#9888; ВАЖНО: Такса за диагностика 30 лв. (15,32 €)
              </p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                Таксата покрива посещението на място, инспекцията и диагностиката на проблема с вашия уред.
              </p>
            </div>
            
            <!-- Contact info -->
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                При въпроси или промяна на часа, моля свържете се с нас:
              </p>
              <p style="margin: 0;">
                <a href="tel:+359898340982" style="color: #2563eb; text-decoration: none; font-size: 18px; font-weight: bold;">
                  &#128222; +359 89 834 0982
                </a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                РотоРем Варна - Професионален ремонт на битова техника<br>
                <a href="https://rotorem.bg" style="color: #2563eb; text-decoration: none;">rotorem.bg</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Create plain text version as fallback
    const plainText = `
Здравейте, ${data.name}!

Получихме вашата заявка за ремонт. Ще се свържем с вас скоро за потвърждение на часа.

ДЕТАЙЛИ НА ЗАЯВКАТА:
Дата: ${formattedDate}
Час: ${data.time}
Адрес: ${data.address}${data.apartment ? ', ' + data.apartment : ''}, ${data.city}
Уред: ${data.appliance}
${data.details ? 'Описание: ' + data.details : ''}

ВАЖНО: Такса за диагностика 30 лв. (15,32 €)
Таксата покрива посещението на място, инспекцията и диагностиката на проблема с вашия уред.

При въпроси или промяна на часа, моля свържете се с нас:
Телефон: +359 89 834 0982

--
РотоРем Варна - Професионален ремонт на битова техника
https://rotorem.bg
    `;
    
    GmailApp.sendEmail(recipient, subject, plainText.trim(), {
      htmlBody: htmlBody,
      replyTo: 'werbenhs@gmail.com', // Admin email for replies
      name: 'РотоРем Варна',
      charset: 'UTF-8' // Ensure UTF-8 encoding
    });
    
    console.log('Customer confirmation email sent to:', recipient);
  } catch (error) {
    console.error('Error sending customer email:', error);
    throw error;
  }
}

// Get calendar data for AJAX request
function getCalendarData(month, year) {
  try {
    const allBookings = getAllBookings();
    const calendarHTML = generateMobileCalendar(allBookings, month, year);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        html: calendarHTML,
        month: month,
        year: year
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error getting calendar data:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Get booking details for a specific date
function getBookingDetails(date) {
  try {
    const allBookings = getAllBookings();
    const dayBookings = allBookings.filter(booking => 
      booking.date === date && booking.status !== 'Cancelled'
    );
    
    // Sort by time
    dayBookings.sort((a, b) => {
      const timeA = a.time.split('-')[0];
      const timeB = b.time.split('-')[0];
      return timeA.localeCompare(timeB);
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        bookings: dayBookings,
        date: date
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error getting booking details:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendBookingEmail(data) {
  try {
    const subject = 'Нова заявка за ремонт от rotorem.bg';
    const recipient = 'werbenhs@gmail.com';
    
    // Generate unique booking ID for tracking
    const bookingId = generateBookingId(data);
    
    // URLs for confirm/cancel actions
    const confirmUrl = `${ScriptApp.getService().getUrl()}?action=confirm&bookingId=${bookingId}&date=${data.date}&time=${data.time}`;
    const cancelUrl = `${ScriptApp.getService().getUrl()}?action=cancel&bookingId=${bookingId}&date=${data.date}&time=${data.time}`;
    
    // Admin and sheet links
    const adminBoardUrl = 'https://script.google.com/macros/s/AKfycbyEuA51niEYvOG3erkABkleEKnPySeYI_4dLwRYg79KmmK2inI32t5iVAhvCeGA8oxV1Q/exec?admin=true';
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/14NRuyOjH_aqJZAzt3SmU1qijlTznr0nj6zYKVZRln1U/edit?usp=sharing';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Нова заявка за ремонт</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">НОВА ЗАЯВКА ЗА РЕМОНТ</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">РотоРем Варна - Професионален ремонт</p>
          </div>
          
          <!-- Action Buttons -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 15px 0; color: #374151; font-weight: bold; font-size: 16px;">Изберете действие:</p>
            <div style="display: inline-block;">
              <a href="${confirmUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">ПОТВЪРДИ</a>
              <a href="${cancelUrl}" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">ОТКАЖИ</a>
            </div>
            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Кликнете веднъж за да потвърдите или откажете заявката</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 18px;">Детайли на заявката:</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 30%;">Клиент:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${data.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Телефон:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;"><a href="tel:${data.phone}" style="color: #2563eb; text-decoration: none;">${data.phone}</a></td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Имейл:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${data.email || 'Не е посочен'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Дата:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: bold; font-size: 16px;">${data.date}</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Час:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: bold; font-size: 16px;">${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Адрес:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${data.address}${data.apartment ? ', ' + data.apartment : ''}, ${data.city}</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Уред:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${data.appliance}</td>
              </tr>
              ${data.details ? `
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Описание:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${data.details}</td>
              </tr>
              ` : ''}
              ${data.directions ? `
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px 16px; font-weight: bold; color: #374151;">Инструкции:</td>
                <td style="padding: 12px 16px; color: #6b7280;">${data.directions}</td>
              </tr>
              ` : ''}
            </table>
            
            <!-- Status Box -->
            <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0; font-weight: bold; color: #1e40af; font-size: 16px;">
                СТАТУС: Изчаква потвърждение
              </p>
              <p style="margin: 8px 0 0 0; color: #1e40af; font-size: 14px;">
                ID на заявката: ${bookingId}
              </p>
            </div>
            
            <!-- Action Buttons (repeated for convenience) -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">ПОТВЪРДИ ЗАЯВКАТА</a>
              <a href="${cancelUrl}" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 8px; font-size: 16px;">ОТКАЖИ ЗАЯВКАТА</a>
            </div>
            
            <!-- Quick Access Links -->
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: bold;">БЪРЗ ДОСТЪП:</h3>
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                <a href="${adminBoardUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 14px; flex: 1; min-width: 160px; text-align: center;">АДМИН ПАНЕЛ</a>
                <a href="${sheetUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; font-size: 14px; flex: 1; min-width: 160px; text-align: center;">GOOGLE SHEETS</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                Тази заявка е получена от уебсайта <strong>rotorem.bg</strong><br>
                Кликнете върху един от бутоните по-горе за да потвърдите или откажете заявката.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Create plain text version as fallback
    const plainText = `
НОВА ЗАЯВКА ЗА РЕМОНТ

БЪРЗИ ДЕЙСТВИЯ:
Потвърди: ${confirmUrl}
Откажи: ${cancelUrl}

БЪРЗ ДОСТЪП:
Админ панел: ${adminBoardUrl}
Google Sheets: ${sheetUrl}

Клиент: ${data.name}
Телефон: ${data.phone}
Имейл: ${data.email || 'Не е посочен'}
Дата: ${data.date}
Час: ${data.time}
Адрес: ${data.address}${data.apartment ? ', ' + data.apartment : ''}, ${data.city}
Уред: ${data.appliance}
${data.details ? 'Описание: ' + data.details : ''}
${data.directions ? 'Инструкции: ' + data.directions : ''}

СТАТУС: Изчаква потвърждение
ID: ${bookingId}

Тази заявка е получена от уебсайта rotorem.bg
Кликнете върху един от линковете по-горе за да потвърдите или откажете заявката.
    `;
    
    GmailApp.sendEmail(recipient, subject, plainText.trim(), {
      htmlBody: htmlBody,
      replyTo: data.email || recipient
    });
    
    console.log('Email sent successfully to:', recipient);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Generate a unique booking ID based on booking data
function generateBookingId(data) {
  const timestamp = new Date().getTime().toString(36);
  const nameHash = data.name.replace(/\s+/g, '').substring(0, 3).toLowerCase();
  const dateHash = data.date.replace(/-/g, '').substring(2); // YYMMDD
  const timeHash = data.time.replace(/[:-]/g, '').substring(0, 4); // HHMM
  return `${nameHash}${dateHash}${timeHash}${timestamp}`.substring(0, 12);
}

// Handle booking confirmation/cancellation
function handleBookingAction(action, bookingId, date, time, redirect) {
  try {
    console.log(`Handling ${action} action for booking ID: ${bookingId}, date: ${date}, time: ${time}`);
    
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    let bookingFound = false;
    let customerName = '';
    let customerPhone = '';
    let previousStatus = '';
    let bookingData = null;
    
    // Find the booking in the sheet
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = formatDate(row[3]); // Date column (D)
      const rowTime = row[4]; // Time column (E)
      const currentStatus = row[11]; // Status column (L)
      
      // Match by date and time
      if (rowDate === date && rowTime.toString() === time) {
        bookingFound = true;
        customerName = row[0]; // Name column (A)
        customerPhone = row[1]; // Phone column (B)
        previousStatus = currentStatus || 'Pending';
        
        // Store booking data for calendar update
        bookingData = {
          name: row[0],
          phone: row[1],
          email: row[2],
          date: rowDate,
          time: rowTime,
          address: row[5],
          apartment: row[6],
          city: row[7],
          appliance: row[9]
        };
        
        // Update the status
        const newStatus = action === 'confirm' ? 'Confirmed' : 'Cancelled';
        sheet.getRange(i + 1, 12).setValue(newStatus); // Update status column (L)
        
        console.log(`Updated booking status from ${previousStatus} to: ${newStatus}`);
        
        // UPDATE CALENDAR EVENT
        try {
          updateCalendarEventStatus(bookingData, newStatus);
          console.log('Calendar event updated successfully');
        } catch (calendarError) {
          console.error('Calendar event update failed:', calendarError);
        }
        
        break;
      }
    }
    
    // Rest of the existing handleBookingAction function...
    // (keeping the existing response logic)
    
    // If redirect=admin, show a simple success page that auto-closes
    if (redirect === 'admin') {
      const statusIcon = action === 'confirm' ? '✅' : '❌';
      const statusText = action === 'confirm' ? 'ПОТВЪРДЕНА' : 'ОТКАЗАНА';
      
      const quickSuccessHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Заявка ${statusText}</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
          <div style="background-color: white; border-radius: 8px; padding: 40px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px;">
            <div style="font-size: 64px; margin-bottom: 20px;">${statusIcon}</div>
            <h1 style="color: #374151; margin: 0 0 10px 0; font-size: 24px;">Заявка ${statusText}</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              ${bookingFound ? `${customerName} - ${date} в ${time}` : 'Обработката е завършена'}
            </p>
            <p style="color: #6b7280; font-size: 14px;">Този прозорец ще се затвори автоматично...</p>
          </div>
          
          <script>
            // Auto-close after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(quickSuccessHtml)
        .setTitle(`Заявка ${statusText}`)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    // Generate success page (for email actions)
    const statusColor = action === 'confirm' ? '#10b981' : '#ef4444';
    const statusIcon = action === 'confirm' ? '✅' : '❌';
    const statusText = action === 'confirm' ? 'ПОТВЪРДЕНА' : 'ОТКАЗАНА';
    const statusMessage = action === 'confirm' ? 
      'Заявката е успешно потвърдена. Клиентът ще бъде уведомен.' :
      'Заявката е отказана. Времето е освободено за нови заявки.';
    
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Заявка ${statusText}</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: 50px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;">
          
          <!-- Header -->
          <div style="background: ${statusColor}; color: white; padding: 40px 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">ЗАЯВКА ${statusText}</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 18px;">${statusMessage}</h2>
            
            ${bookingFound ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Клиент:</strong> ${customerName}</p>
              <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Телефон:</strong> ${customerPhone}</p>
              <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Дата:</strong> ${date}</p>
              <p style="margin: 0 0 8px 0; color: #6b7280;"><strong>Час:</strong> ${time}</p>
              <p style="margin: 0; color: #6b7280;"><strong>Предишен статус:</strong> ${previousStatus}</p>
            </div>
            ` : `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">⚠️ Заявката не беше намерена или вече е обработена.</p>
            </div>
            `}
            
            <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
              ID на заявката: ${bookingId}
            </p>
            
            <div style="margin-top: 30px;">
              <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin-right: 10px;">
                Затвори прозореца
              </button>
              <button onclick="window.history.back()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">
                Назад към заявките
              </button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(successHtml)
      .setTitle(`Заявка ${statusText}`)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Error handling booking action:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Грешка</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: 50px auto; background-color: white; border-radius: 8px; padding: 40px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <div style="font-size: 48px; color: #ef4444; margin-bottom: 20px;">⚠️</div>
          <h1 style="color: #374151; margin: 0 0 20px 0;">Възникна грешка</h1>
          <p style="color: #6b7280; margin: 0 0 30px 0;">Моля опитайте отново или се свържете с администратора.</p>
          <div>
            <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin-right: 10px;">
              Затвори прозореца
            </button>
            <button onclick="window.history.back()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer;">
              Назад към заявките
            </button>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(errorHtml)
      .setTitle('Грешка')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// NEW FUNCTION: Update calendar event when booking status changes
function updateCalendarEventStatus(bookingData, newStatus) {
  try {
    const CALENDAR_EMAIL = 'werbenhs@gmail.com'; // Same as in createCalendarEvent
    
    // Get the calendar
    let calendar;
    try {
      if (CALENDAR_EMAIL !== Session.getActiveUser().getEmail()) {
        calendar = CalendarApp.getCalendarById(CALENDAR_EMAIL);
      } else {
        calendar = CalendarApp.getDefaultCalendar();
      }
    } catch (e) {
      calendar = CalendarApp.getDefaultCalendar();
    }
    
    // Search for the event by title and date
    const eventTitle = `Ремонт ${bookingData.appliance} - ${bookingData.name}`;
    const searchDate = new Date(bookingData.date);
    
    // Get events for the booking date
    const events = calendar.getEventsForDay(searchDate);
    
    // Find the matching event
    let targetEvent = null;
    for (let event of events) {
      if (event.getTitle() === eventTitle) {
        targetEvent = event;
        break;
      }
    }
    
    if (targetEvent) {
      if (newStatus === 'Confirmed') {
        // Update event for confirmed booking
        try {
          targetEvent.setColor(CalendarApp.EventColor.GREEN); // Green for confirmed
          
          // Update title and description
          const confirmedTitle = `✅ Ремонт ${bookingData.appliance} - ${bookingData.name}`;
          targetEvent.setTitle(confirmedTitle);
          
          const confirmedDescription = `
ПОТВЪРДЕНА ЗАЯВКА ЗА РЕМОНТ

Клиент: ${bookingData.name}
Телефон: ${bookingData.phone}
${bookingData.email ? `Имейл: ${bookingData.email}` : ''}

Адрес: ${bookingData.address}${bookingData.apartment ? ', ' + bookingData.apartment : ''}
Град: ${bookingData.city}

Уред: ${bookingData.appliance}

Статус: ПОТВЪРДЕНА
Диагностика: 30 лв.

Това събитие е обновено автоматично от системата за запазване на rotorem.bg
          `.trim();
          
          targetEvent.setDescription(confirmedDescription);
          
          console.log('Calendar event updated to confirmed status');
          
        } catch (updateError) {
          console.error('Could not update event properties:', updateError);
        }
        
      } else if (newStatus === 'Cancelled') {
        // For cancelled bookings, either delete the event or mark as cancelled
        try {
          // Option 1: Delete the event completely
          targetEvent.deleteEvent();
          console.log('Calendar event deleted for cancelled booking');
          
          // Option 2: Mark as cancelled (uncomment if you prefer this)
          /*
          targetEvent.setColor(CalendarApp.EventColor.RED); // Red for cancelled
          const cancelledTitle = `❌ [ОТКАЗАНА] Ремонт ${bookingData.appliance} - ${bookingData.name}`;
          targetEvent.setTitle(cancelledTitle);
          console.log('Calendar event marked as cancelled');
          */
          
        } catch (deleteError) {
          console.error('Could not delete/update cancelled event:', deleteError);
        }
      }
    } else {
      console.log('No matching calendar event found to update');
    }
    
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Handle deleting a booking completely
function handleDeleteBooking(date, time, redirect) {
  try {
    console.log(`Deleting booking for date: ${date}, time: ${time}`);
    
    const sheet = SpreadsheetApp.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    let bookingFound = false;
    let customerName = '';
    
    // Find and delete the booking from the sheet
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = formatDate(row[3]); // Date column (D)
      const rowTime = row[4]; // Time column (E)
      
      // Match by date and time
      if (rowDate === date && rowTime.toString() === time) {
        bookingFound = true;
        customerName = row[0]; // Name column (A)
        
        // Delete the entire row
        sheet.deleteRow(i + 1);
        console.log(`Deleted booking row for ${customerName}`);
        break;
      }
    }
    
    // If redirect=admin, show a simple success page that auto-closes
    if (redirect === 'admin') {
      const quickSuccessHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Заявка изтрита</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
          <div style="background-color: white; border-radius: 8px; padding: 40px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 400px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🗑️</div>
            <h1 style="color: #374151; margin: 0 0 10px 0; font-size: 24px;">Заявка изтрита</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0;">
              ${bookingFound ? `${customerName} - ${date} в ${time}` : 'Заявката беше изтрита'}
            </p>
            <p style="color: #6b7280; font-size: 14px;">Този прозорец ще се затвори автоматично...</p>
          </div>
          
          <script>
            // Auto-close after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(quickSuccessHtml)
        .setTitle('Заявка изтрита')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    return HtmlService.createHtmlOutput('Заявката беше изтрита успешно.')
      .setTitle('Заявка изтрита')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Error deleting booking:', error);
    return HtmlService.createHtmlOutput('Грешка при изтриване на заявката.')
      .setTitle('Грешка')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// Create mobile-optimized admin page
function createMobileAdminPage() {
  try {
    const allBookings = getAllBookings();
    
    // Get today's date for comparison
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Sort bookings by date (upcoming first)
    allBookings.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
    
    // Categorize bookings - FIXED: separate confirmed and pending
    const confirmedBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= today && booking.status === 'Confirmed';
    });
    
    const pendingBookings = allBookings.filter(booking => booking.status === 'Pending');
    const cancelledBookings = allBookings.filter(booking => booking.status === 'Cancelled');
    
    // Generate initial calendar
    const calendarHTML = generateMobileCalendar(allBookings, today.getMonth(), today.getFullYear());
    const listsHTML = generateMobileLists(confirmedBookings, pendingBookings, cancelledBookings, todayString);
    
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>РотоРем - Моите заявки</title>
        <style>
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          /* Fixed header */
          .header {
            background: #2563eb;
            color: white;
            padding: 15px;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
          }
          .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          
          /* Bottom navigation */
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 100;
          }
          .nav-btn {
            flex: 1;
            padding: 12px;
            border: none;
            background: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #6b7280;
            transition: all 0.2s ease;
          }
          .nav-btn.active {
            color: #2563eb;
          }
          .nav-btn:active {
            background: #f3f4f6;
          }
          .nav-icon {
            font-size: 24px;
          }
          
          /* Content area */
          .content {
            flex: 1;
            padding: 10px;
            padding-bottom: 70px; /* Space for bottom nav */
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Views */
          .view {
            display: none;
          }
          .view.active {
            display: block;
          }
          
          /* Calendar styles */
          .calendar-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 12px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .month-nav {
            background: #f3f4f6;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
          }
          .month-nav:active {
            background: #e5e7eb;
          }
          .month-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }
          
          .calendar-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
          }
          .calendar-day-header {
            background: #f9fafb;
            padding: 8px 0;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
          }
          .calendar-day {
            aspect-ratio: 1;
            border-right: 1px solid #f3f4f6;
            border-bottom: 1px solid #f3f4f6;
            padding: 4px;
            position: relative;
            cursor: pointer;
            transition: background 0.2s ease;
            display: flex;
            flex-direction: column;
          }
          .calendar-day:active {
            background: #f3f4f6;
          }
          .calendar-day:nth-child(7n) {
            border-right: none;
          }
          .calendar-day.other-month {
            background: #fafafa;
            opacity: 0.4;
            pointer-events: none;
          }
          .calendar-day.today {
            background: #dbeafe;
          }
          .day-number {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
          }
          .booking-indicators {
            flex: 1;
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
            margin-top: 2px;
          }
          .booking-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }
          .booking-dot.pending { background: #fbbf24; }
          .booking-dot.confirmed { background: #34d399; }
          
          /* Booking cards */
          .booking-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
          }
          .booking-card:active {
            transform: scale(0.98);
          }
          .booking-card.today {
            background: #dbeafe;
            border: 2px solid #3b82f6;
          }
          
          .booking-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 12px;
          }
          .booking-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
          }
          .booking-datetime {
            font-size: 14px;
            color: #3b82f6;
            font-weight: 500;
          }
          .booking-status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-pending {
            background: #fef3c7;
            color: #b45309;
          }
          .status-confirmed {
            background: #d1fae5;
            color: #065f46;
          }
          
          .booking-details {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          .booking-detail {
            margin-bottom: 4px;
          }
          
          /* Action buttons */
          .booking-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .action-btn {
            flex: 1;
            min-width: 100px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
          }
          .action-btn:active {
            transform: scale(0.95);
          }
          .btn-call {
            background: #3b82f6;
            color: white;
          }
          .btn-confirm {
            background: #10b981;
            color: white;
          }
          .btn-cancel {
            background: #ef4444;
            color: white;
          }
          .btn-delete {
            background: #6b7280;
            color: white;
          }
          
          /* Section headers */
          .section-header {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin: 16px 0 8px 0;
            padding: 8px 12px;
            background: #f3f4f6;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-count {
            background: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 14px;
            color: #6b7280;
          }
          
          .no-bookings {
            text-align: center;
            padding: 40px 20px;
            color: #9ca3af;
            font-size: 14px;
          }
          
          /* Modal for booking details */
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 200;
            padding: 20px;
            overflow-y: auto;
          }
          .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          }
          .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }
          .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
          }
          .modal-close:active {
            background: #f3f4f6;
          }
          .modal-body {
            padding: 20px;
          }
          
          /* Loading state */
          .loading {
            text-align: center;
            padding: 40px;
            color: #6b7280;
          }
          .spinner {
            display: inline-block;
            width: 24px;
            height: 24px;
            border: 3px solid #f3f4f6;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Моите заявки</h1>
            <p>Изчакват: ${pendingBookings.length} | Потвърдени: ${confirmedBookings.length}</p>
          </div>
          
          <div class="content">
            <!-- List View -->
            <div id="list-view" class="view active">
              ${listsHTML}
            </div>
            
            <!-- Calendar View -->
            <div id="calendar-view" class="view">
              <div class="calendar-controls">
                <button class="month-nav" onclick="changeMonth(-1)">‹</button>
                <div class="month-title" id="month-title"></div>
                <button class="month-nav" onclick="changeMonth(1)">›</button>
              </div>
              <div id="calendar-container">
                ${calendarHTML}
              </div>
            </div>
          </div>
          
          <!-- Bottom Navigation -->
          <div class="bottom-nav">
            <button class="nav-btn active" onclick="switchView('list')">
              <span class="nav-icon">📋</span>
              <span>Списък</span>
            </button>
            <button class="nav-btn" onclick="switchView('calendar')">
              <span class="nav-icon">📅</span>
              <span>Календар</span>
            </button>
          </div>
        </div>
        
        <!-- Modal for booking details -->
        <div id="booking-modal" class="modal" onclick="closeModalOnBackdrop(event)">
          <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Заявки за деня</h3>
              <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body" id="modal-body">
              <div class="loading"><div class="spinner"></div></div>
            </div>
          </div>
        </div>
        
        <script>
          let currentMonth = ${today.getMonth()};
          let currentYear = ${today.getFullYear()};
          const scriptUrl = '${ScriptApp.getService().getUrl()}';
          
          function switchView(viewName) {
            // Update views
            document.querySelectorAll('.view').forEach(view => {
              view.classList.remove('active');
            });
            document.getElementById(viewName + '-view').classList.add('active');
            
            // Update nav buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            event.currentTarget.classList.add('active');
            
            // Update calendar title when switching to calendar
            if (viewName === 'calendar') {
              updateCalendarTitle();
            }
          }
          
          function updateCalendarTitle() {
            const monthNames = [
              'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
              'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
            ];
            document.getElementById('month-title').textContent = monthNames[currentMonth] + ' ' + currentYear;
          }
          
          function changeMonth(direction) {
            currentMonth += direction;
            
            if (currentMonth > 11) {
              currentMonth = 0;
              currentYear++;
            } else if (currentMonth < 0) {
              currentMonth = 11;
              currentYear--;
            }
            
            // Update calendar via AJAX
            updateCalendar();
          }
          
          function updateCalendar() {
            const container = document.getElementById('calendar-container');
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            
            // Fetch calendar data
            fetch(scriptUrl + '?ajax=calendar&month=' + currentMonth + '&year=' + currentYear)
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  container.innerHTML = data.html;
                  updateCalendarTitle();
                } else {
                  container.innerHTML = '<div class="no-bookings">Грешка при зареждане на календара</div>';
                }
              })
              .catch(error => {
                console.error('Error:', error);
                container.innerHTML = '<div class="no-bookings">Грешка при зареждане на календара</div>';
              });
          }
          
          function showDayBookings(date) {
            const modal = document.getElementById('booking-modal');
            const modalBody = document.getElementById('modal-body');
            
            modal.classList.add('active');
            modalBody.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            
            // Fetch bookings for the date
            fetch(scriptUrl + '?ajax=bookingDetails&date=' + date)
              .then(response => response.json())
              .then(data => {
                if (data.success && data.bookings.length > 0) {
                  let html = '<div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">' + 
                             formatDisplayDate(data.date) + '</div>';
                  
                  data.bookings.forEach(booking => {
                    const statusClass = booking.status === 'Confirmed' ? 'status-confirmed' : 'status-pending';
                    const statusText = booking.status === 'Confirmed' ? 'Потвърдена' : 'Изчаква';
                    
                    html += \`
                      <div class="booking-card">
                        <div class="booking-header">
                          <div>
                            <div class="booking-name">\${booking.name}</div>
                            <div class="booking-datetime">\${booking.time}</div>
                          </div>
                          <span class="booking-status \${statusClass}">\${statusText}</span>
                        </div>
                        <div class="booking-details">
                          <div class="booking-detail">📱 \${booking.phone}</div>
                          <div class="booking-detail">🔧 \${booking.appliance}</div>
                          <div class="booking-detail">📍 \${booking.address}\${booking.apartment ? ', ' + booking.apartment : ''}</div>
                        </div>
                        <div class="booking-actions">
                          <a href="tel:\${booking.phone}" class="action-btn btn-call">📞 Обади се</a>
                          \${booking.status === 'Pending' ? 
                            '<button class="action-btn btn-confirm" onclick="performBookingAction(\\'confirm\\', \\'' + booking.date + '\\', \\'' + booking.time + '\\', this)">✅ Потвърди</button>' : ''
                          }
                        </div>
                      </div>
                    \`;
                  });
                  
                  modalBody.innerHTML = html;
                } else {
                  modalBody.innerHTML = '<div class="no-bookings">Няма заявки за този ден</div>';
                }
              })
              .catch(error => {
                console.error('Error:', error);
                modalBody.innerHTML = '<div class="no-bookings">Грешка при зареждане</div>';
              });
          }
          
          function closeModal() {
            document.getElementById('booking-modal').classList.remove('active');
          }
          
          function closeModalOnBackdrop(event) {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }
          
          function performBookingAction(action, date, time, element) {
            const messages = {
              'confirm': 'Потвърждавате заявката?',
              'cancel': 'Отказвате заявката?',
              'delete': 'ВНИМАНИЕ: Това ще изтрие заявката завинаги. Сигурни ли сте?'
            };
            
            if (!confirm(messages[action])) {
              return;
            }
            
            // Show loading state
            element.style.opacity = '0.6';
            element.disabled = true;
            
            // Perform action
            const url = action === 'delete' 
              ? scriptUrl + '?delete=true&date=' + date + '&time=' + time + '&redirect=admin'
              : scriptUrl + '?action=' + action + '&date=' + date + '&time=' + time + '&redirect=admin';
            
            // Open in new window to avoid blank page
            const newWindow = window.open(url, '_blank', 'width=400,height=300');
            
            // Reload after delay
            setTimeout(() => {
              window.location.reload();
            }, 2500);
          }
          
          function formatDisplayDate(dateString) {
            const date = new Date(dateString);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            if (dateString === today.toISOString().split('T')[0]) {
              return 'ДНЕС';
            }
            if (dateString === tomorrow.toISOString().split('T')[0]) {
              return 'УТРЕ';
            }
            
            const dayNames = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
            const monthNames = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
            
            return dayNames[date.getDay()] + ', ' + date.getDate() + ' ' + monthNames[date.getMonth()];
          }
          
          // Auto-refresh every 5 minutes
          setInterval(() => {
            window.location.reload();
          }, 5 * 60 * 1000);
        </script>
      </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(adminHtml)
      .setTitle('РотоРем - Моите заявки')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Error creating admin page:', error);
    
    const errorHtml = `
      <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>Грешка при зареждане</h2>
        <p>Моля опитайте отново.</p>
        <button onclick="window.location.reload()" style="padding: 15px 30px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 6px;">Опитай пак</button>
      </body></html>
    `;
    
    return HtmlService.createHtmlOutput(errorHtml);
  }
}

// Generate mobile-optimized calendar
function generateMobileCalendar(bookings, month, year) {
  try {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const dayNames = ['Н', 'П', 'В', 'С', 'Ч', 'П', 'С'];
    
    // Group bookings by date
    const bookingsByDate = {};
    bookings.forEach(booking => {
      if (booking.status !== 'Cancelled') {
        if (!bookingsByDate[booking.date]) {
          bookingsByDate[booking.date] = [];
        }
        bookingsByDate[booking.date].push(booking);
      }
    });
    
    // Get today for highlighting
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    let calendarHTML = '<div class="calendar-container"><div class="calendar-grid">';
    
    // Add day headers
    dayNames.forEach(dayName => {
      calendarHTML += `<div class="calendar-day-header">${dayName}</div>`;
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarHTML += `<div class="calendar-day other-month"></div>`;
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = date === todayString;
      const dayBookings = bookingsByDate[date] || [];
      
      let dayClass = 'calendar-day';
      if (isToday) dayClass += ' today';
      
      calendarHTML += `<div class="${dayClass}" onclick="showDayBookings('${date}')">`;
      calendarHTML += `<div class="day-number">${day}</div>`;
      
      if (dayBookings.length > 0) {
        calendarHTML += '<div class="booking-indicators">';
        dayBookings.forEach((booking, index) => {
          if (index < 4) { // Show max 4 dots
            const dotClass = booking.status === 'Confirmed' ? 'confirmed' : 'pending';
            calendarHTML += `<span class="booking-dot ${dotClass}"></span>`;
          }
        });
        calendarHTML += '</div>';
      }
      
      calendarHTML += '</div>';
    }
    
    calendarHTML += '</div></div>';
    
    return calendarHTML;
  } catch (error) {
    console.error('Error generating calendar:', error);
    return '<div class="no-bookings">Грешка при генериране на календар</div>';
  }
}

// Generate mobile-optimized lists
function generateMobileLists(confirmedBookings, pendingBookings, cancelledBookings, todayString) {
  try {
    let listsHTML = '';
    
    // Pending bookings (need attention) - shown first on mobile
    if (pendingBookings.length > 0) {
      listsHTML += `
        <div class="section-header">
          <span>⏳ Изчакват потвърждение</span>
          <span class="section-count">${pendingBookings.length}</span>
        </div>
      `;
      
      pendingBookings.forEach(booking => {
        const isToday = booking.date === todayString;
        listsHTML += createBookingCard(booking, isToday, true);
      });
    }
    
    // Confirmed bookings
    listsHTML += `
      <div class="section-header">
        <span>✅ Потвърдени заявки</span>
        <span class="section-count">${confirmedBookings.length}</span>
      </div>
    `;
    
    if (confirmedBookings.length === 0) {
      listsHTML += '<div class="no-bookings">Няма потвърдени заявки</div>';
    } else {
      confirmedBookings.forEach(booking => {
        const isToday = booking.date === todayString;
        listsHTML += createBookingCard(booking, isToday, false);
      });
    }
    
    // Cancelled bookings (optional - could be hidden by default)
    if (cancelledBookings.length > 0) {
      listsHTML += `
        <div class="section-header">
          <span>❌ Отказани</span>
          <span class="section-count">${cancelledBookings.length}</span>
        </div>
      `;
      
      cancelledBookings.forEach(booking => {
        listsHTML += createCancelledBookingCard(booking);
      });
    }
    
    return listsHTML;
  } catch (error) {
    console.error('Error generating lists:', error);
    return '<div class="no-bookings">Грешка при генериране на списъците</div>';
  }
}

// Helper function to create booking card
function createBookingCard(booking, isToday, showConfirmButton) {
  const cardClass = isToday ? 'booking-card today' : 'booking-card';
  const statusClass = booking.status === 'Confirmed' ? 'status-confirmed' : 'status-pending';
  const statusText = booking.status === 'Confirmed' ? 'Потвърдена' : 'Изчаква';
  
  return `
    <div class="${cardClass}">
      <div class="booking-header">
        <div>
          <div class="booking-name">${booking.name}</div>
          <div class="booking-datetime">${formatDisplayDate(booking.date)} в ${booking.time}</div>
        </div>
        <span class="booking-status ${statusClass}">${statusText}</span>
      </div>
      <div class="booking-details">
        <div class="booking-detail">🔧 ${booking.appliance}</div>
        <div class="booking-detail">📍 ${booking.address}${booking.apartment ? ', ' + booking.apartment : ''}</div>
        ${booking.details ? `<div class="booking-detail">💬 ${booking.details}</div>` : ''}
      </div>
      <div class="booking-actions">
        <a href="tel:${booking.phone}" class="action-btn btn-call">📞 ${booking.phone}</a>
        ${showConfirmButton ? `
          <button class="action-btn btn-confirm" onclick="performBookingAction('confirm', '${booking.date}', '${booking.time}', this)">✅ Потвърди</button>
        ` : ''}
        <button class="action-btn btn-cancel" onclick="performBookingAction('cancel', '${booking.date}', '${booking.time}', this)">❌ Откажи</button>
      </div>
    </div>
  `;
}

// Helper function to create cancelled booking card
function createCancelledBookingCard(booking) {
  return `
    <div class="booking-card" style="opacity: 0.7;">
      <div class="booking-header">
        <div>
          <div class="booking-name" style="text-decoration: line-through;">${booking.name}</div>
          <div class="booking-datetime">${formatDisplayDate(booking.date)} в ${booking.time}</div>
        </div>
      </div>
      <div class="booking-actions">
        <button class="action-btn btn-confirm" onclick="performBookingAction('confirm', '${booking.date}', '${booking.time}', this)">↩️ Възстанови</button>
        <button class="action-btn btn-delete" onclick="performBookingAction('delete', '${booking.date}', '${booking.time}', this)">🗑️ Изтрий</button>
      </div>
    </div>
  `;
}

// Helper function to format dates for display
function formatDisplayDate(dateString) {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (dateString === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`) {
      return 'ДНЕС';
    }
    
    if (dateString === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`) {
      return 'УТРЕ';
    }
    
    const dayNames = ['Нед', 'Пон', 'Вто', 'Сря', 'Чет', 'Пет', 'Съб'];
    const monthNames = ['ян', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];
    
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`;
  } catch (error) {
    return dateString;
  }
}

// Test functions
function testFormData() {
  console.log('Testing form data submission...');
  
  const testData = {
    name: 'Test Mobile User',
    phone: '0877324272',
    email: 'test@example.com',
    date: '2025-06-01',
    time: '09:00-11:00',
    address: 'Test Address 123',
    apartment: '2',
    city: 'Varna',
    appliance: 'Washing Machine',
    details: 'Mobile test booking',
    directions: 'Ring the bell'
  };
  
  const e = { parameter: testData };
  const result = doPost(e);
  console.log('Test result:', result.getContent());
}

function testGetBookedSlots() {
  console.log('Testing getBookedSlots...');
  const slots = getBookedSlots();
  console.log('Retrieved slots:', slots);
  return slots;
}