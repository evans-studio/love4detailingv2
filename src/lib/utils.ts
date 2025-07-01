import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addMinutes, parse } from 'date-fns';
import { customAlphabet } from 'nanoid';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Formats a date to a human-readable string
 */
export function formatDate(date: string | Date, formatString: string = 'PPP'): string {
  return format(new Date(date), formatString);
}

/**
 * Formats a time slot (HH:mm) to a human-readable string
 */
export function formatTimeSlot(timeSlot: string): string {
  return format(parse(timeSlot, 'HH:mm', new Date()), 'h:mm aa');
}

/**
 * Calculates the end time of a service based on start time and duration
 */
export function calculateEndTime(startTime: string, durationInMinutes: number): string {
  const startDate = parse(startTime, 'HH:mm', new Date());
  return format(addMinutes(startDate, durationInMinutes), 'HH:mm');
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

export function formatTime(time: string): string {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateTimeSlots(date: Date): string[] {
  const slots = ['10:00', '11:30', '13:00', '14:30', '16:00'];
  
  // Don't generate slots for Sundays
  if (date.getDay() === 0) {
    return [];
  }
  
  return slots;
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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
} 