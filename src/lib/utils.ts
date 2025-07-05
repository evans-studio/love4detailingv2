import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { customAlphabet } from 'nanoid';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price in pence to pounds with currency symbol
 */
export function formatCurrency(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a time string to a human-readable format
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return new Date(0, 0, 0, parseInt(hours), parseInt(minutes))
    .toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
}

// Create a custom nanoid generator with only uppercase letters and numbers
const generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

/**
 * Generates a booking reference number
 */
export function generateBookingReference(): string {
  return `L4D-${generateId()}`;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Generate time slots for a given date
 */
export function generateTimeSlots(date: Date): string[] {
  const slots: string[] = [];
  const startHour = 10; // 10:00 AM
  const endHour = 18; // 6:00 PM
  const interval = 30; // 30 minutes

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
    }
  }

  return slots;
}

/**
 * Formats a price from pence to pounds with proper currency symbol
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(price / 100);
}

/**
 * Formats a time slot (HH:mm) to a human-readable string
 */
export function formatTimeSlot(timeSlot: string): string {
  return new Date(0, 0, 0, parseInt(timeSlot.split(':')[0]), parseInt(timeSlot.split(':')[1]))
    .toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
}

/**
 * Calculates the end time of a service based on start time and duration
 */
export function calculateEndTime(startTime: string, durationInMinutes: number): string {
  const startDate = new Date(0, 0, 0, parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]));
  const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
  return endDate.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

/**
 * Validates a UK vehicle registration number
 */
export function isValidVehicleReg(reg: string): boolean {
  const regEx = /^[A-Z0-9]{2,7}$/i;
  return regEx.test(reg.replace(/\s/g, ''));
}

/**
 * Validates a UK phone number
 */
export function isValidUKPhone(phone: string): boolean {
  const regEx = /^(?:\+44|0)[1-9]\d{8,9}$/;
  return regEx.test(phone.replace(/\s/g, ''));
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format UK phone numbers
  if (cleaned.startsWith('44')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.startsWith('07') || cleaned.startsWith('02')) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone;
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Calculates the time difference between now and a given date
 */
export function getTimeFromNow(date: Date | string): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMinutes = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d`;
  }
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Extracts error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

/**
 * Safely access nested object properties
 */
export function get(obj: any, path: string, defaultValue: any = undefined) {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);

  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

/**
 * Checks if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  return new Date(date) < new Date();
}

/**
 * Checks if a date is a Sunday
 */
export function isSunday(date: Date | string): boolean {
  return new Date(date).getDay() === 0;
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function isValidPostcode(postcode: string): boolean {
  // UK postcode regex
  const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return regex.test(postcode.trim());
}

export function isValidUKPhoneNumber(phone: string): boolean {
  // UK phone number regex (mobile and landline)
  const regex = /^(?:(?:\+44)|(?:0))(?:(?:(?:1\d{3})|(?:2\d{2})|(?:3\d{2})|(?:7\d{3})|(?:8\d{3})|(?:9\d{2}))\d{6})$/;
  return regex.test(phone.replace(/\s+/g, ''));
}

export function isValidRegistration(reg: string): boolean {
  // UK vehicle registration format validation
  const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$|^[0-9]{1,4}[A-Z]{1,2}$|^[0-9]{1,3}[A-Z]{1,3}$|^[A-Z]{1,2}[0-9]{1,4}$/i;
  return regex.test(reg.replace(/\s/g, ''));
}

export function getVehicleSize(make: string, model: string): 'small' | 'medium' | 'large' | 'xl' {
  // This is a simplified version. In production, we'd use a more comprehensive database
  const sizeMap: Record<string, Record<string, 'small' | 'medium' | 'large' | 'xl'>> = {
    BMW: {
      '1 Series': 'small',
      '2 Series': 'medium',
      '3 Series': 'medium',
      '4 Series': 'medium',
      '5 Series': 'large',
      '7 Series': 'xl',
      X1: 'medium',
      X3: 'large',
      X5: 'xl',
      X7: 'xl',
      M3: 'medium',
      M5: 'large',
    },
    // Add more makes and models as needed
  };

  return sizeMap[make]?.[model] || 'medium';
} 