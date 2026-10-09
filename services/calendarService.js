const ics = require('ics');

function createCalendarEvent({ title, description, startDateTime, durationHours = 1, location = 'Online / Phone Consultation' }) {
  const date = new Date(startDateTime);
  
  const start = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes()
  ];

  const event = {
    start,
    duration: { hours: durationHours, minutes: 0 },
    title: title || 'Flourish Poppies Beauty Consultation',
    description: description || 'Beauty & Bridal Consultation Session with Flourish Poppies.',
    location,
    url: 'https://flourishpoppies.com',
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    organizer: { name: 'Flourish Poppies', email: process.env.COMPANY_EMAIL || 'blessedbestone@gmail.com' }
  };

  return new Promise((resolve, reject) => {
    ics.createEvent(event, (error, value) => {
      if (error) return reject(error);
      resolve(value);
    });
  });
}

function generateGoogleCalendarUrl({ title, description, startDateTime, durationHours = 1 }) {
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  const formatIso = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const datesParam = `${formatIso(startDate)}/${formatIso(endDate)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Flourish Poppies Beauty Consultation',
    details: description || 'Beauty consultation session with Flourish Poppies',
    location: 'Online / Phone Consultation',
    dates: datesParam
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

module.exports = {
  createCalendarEvent,
  generateGoogleCalendarUrl
};
