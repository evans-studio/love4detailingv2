export const bookingContent = {
  steps: {
    registration: {
      title: 'Enter Your Vehicle Registration',
      subtitle: 'We\'ll look up your vehicle details automatically',
      placeholder: 'e.g., AB12 CDE',
      lookupButton: 'Continue',
      lookingUpButton: 'Looking up details...',
      errorMessages: {
        lookupFailed: 'Unable to verify vehicle registration. Please try again.',
        invalidRegistration: 'Please enter a valid registration number',
      },
      vehicleDetails: {
        title: 'Vehicle Details',
        labels: {
          make: 'Make',
          model: 'Model',
          year: 'Year',
          color: 'Color',
          fuelType: 'Fuel Type',
        },
      },
    },
    personalDetails: {
      title: 'Your Contact Details',
      subtitle: 'Please provide your details for the booking',
      fields: {
        fullName: {
          label: 'Full Name',
          placeholder: 'e.g., John Smith',
        },
        email: {
          label: 'Email Address',
          placeholder: 'e.g., john@example.com',
        },
        phone: {
          label: 'Phone Number',
          placeholder: 'e.g., 07700 900000',
        },
        addressLine1: {
          label: 'Address Line 1',
          placeholder: 'e.g., 123 High Street',
        },
        addressLine2: {
          label: 'Address Line 2 (Optional)',
          placeholder: 'e.g., Flat 4',
        },
        postcode: {
          label: 'Postcode',
          placeholder: 'e.g., SW1A 1AA',
        },
      },
      buttons: {
        back: 'Back to Vehicle Details',
        continue: 'Continue to Date & Time',
      },
    },
    dateTime: {
      title: 'Choose Your Appointment',
      subtitle: 'Select a convenient date and time for your service',
      fields: {
        date: {
          label: 'Preferred Date',
          placeholder: 'Select a date',
        },
        time: {
          label: 'Preferred Time',
          placeholder: 'Select a time slot',
        },
      },
      buttons: {
        back: 'Back to Contact Details',
        continue: 'Review Booking',
      },
      unavailable: 'No time slots available on this date',
    },
    summary: {
      title: 'Review Your Booking',
      subtitle: 'Please check all details before confirming',
      sections: {
        vehicle: 'Vehicle Details',
        customer: 'Contact Details',
        appointment: 'Appointment Details',
      },
      buttons: {
        back: 'Back to Date & Time',
        confirm: 'Confirm Booking',
        confirming: 'Confirming your booking...',
      },
      success: {
        title: 'Booking Confirmed!',
        message: 'Your booking has been confirmed. Check your email for details.',
      },
    },
  },
  errors: {
    general: 'Something went wrong. Please try again.',
    validation: 'Please check the highlighted fields below.',
    unavailable: 'This time slot is no longer available. Please select another.',
  },
} as const;

export const timeSlots = [
  { id: '1000', time: '10:00', label: '10:00 AM' },
  { id: '1130', time: '11:30', label: '11:30 AM' },
  { id: '1300', time: '13:00', label: '1:00 PM' },
  { id: '1430', time: '14:30', label: '2:30 PM' },
  { id: '1600', time: '16:00', label: '4:00 PM' },
] as const; 