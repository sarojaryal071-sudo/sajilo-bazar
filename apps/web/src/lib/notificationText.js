// Turns a notification's (type, payload) into display text - one place so
// the inbox screen and any future summary/toast stay in sync.
export function describeNotification({ type, payload }) {
  switch (type) {
    case 'booking_requested':
      return payload.customerName
        ? { title: 'New booking request', body: `${payload.customerName} wants ${payload.serviceName}` }
        : { title: 'New instant request', body: payload.serviceName };
    case 'booking_accepted':
      return { title: 'Booking accepted', body: `${payload.workerName} accepted your booking` };
    case 'booking_declined':
      return { title: 'Booking declined', body: `${payload.workerName} declined your booking` };
    case 'booking_request_expired':
      return {
        title: 'Scheduled request expired',
        body: 'The worker did not respond within the deadline - try booking someone else.',
      };
    case 'booking_status_changed':
      if (payload.status === 'in_progress') {
        return { title: 'Job started', body: 'Your worker started the job' };
      }
      if (payload.status === 'completed') {
        return { title: 'Job completed', body: 'Your booking was marked complete - leave a review?' };
      }
      if (payload.status === 'cancelled') {
        return { title: 'Booking cancelled', body: payload.cancelReason || 'The booking was cancelled' };
      }
      return { title: 'Booking updated', body: '' };
    case 'chat_message':
      return { title: payload.senderName || 'New message', body: payload.preview };
    case 'review_received':
      return {
        title: 'New review',
        body: `${payload.customerName} left you a ${payload.rating}-star review`,
      };
    case 'verification_update':
      return { title: 'Verification update', body: payload.status || '' };
    case 'announcement':
      return { title: payload.title || 'Announcement', body: payload.body || '' };
    default:
      return { title: 'Notification', body: '' };
  }
}
