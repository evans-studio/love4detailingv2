'use client';

import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { VehicleDetails, PersonalDetails, BookingData, VehicleSize } from '@/lib/validation/booking';
import type { DbAvailableSlot } from '@/types';

export enum BookingStep {
  Registration = 'registration',
  PersonalDetails = 'personal_details',
  VehicleSize = 'vehicle_size',
  DateTime = 'date_time',
  Summary = 'summary',
}

interface BookingState {
  currentStep: BookingStep;
  data: {
    vehicle?: VehicleDetails | null;
    customer?: PersonalDetails | null;
    timeSlot?: DbAvailableSlot | null;
    vehicleSize?: VehicleSize | null;
    selectedDate?: string | null;
    selectedTime?: string | null;
    selectedTimeSlotId?: string | null;
    personalDetails: {
      name: string;
      email: string;
      phone: string;
    } | null;
  };
  error: string | null;
  loading: boolean;
  authStatus: { isAuthenticated: boolean };
  bookingType: 'public' | 'dashboard' | null;
}

type BookingAction =
  | { type: 'SET_STEP'; payload: BookingStep }
  | { type: 'SET_VEHICLE_DETAILS'; payload: VehicleDetails | null }
  | { type: 'SET_CUSTOMER_DETAILS'; payload: PersonalDetails | null }
  | { type: 'SET_TIME_SLOT'; payload: DbAvailableSlot | null }
  | { type: 'SET_VEHICLE_SIZE'; payload: VehicleSize | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_BOOKING' }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean } }
  | { type: 'SET_DATE'; payload: string | null }
  | { type: 'SET_TIME'; payload: string | null }
  | { type: 'SET_TIME_SLOT_ID'; payload: string | null }
  | { type: 'SET_PERSONAL_DETAILS'; payload: { name: string; email: string; phone: string; } | null }
  | { type: 'SET_BOOKING_TYPE'; payload: 'public' | 'dashboard' | null }
  | { type: 'RESET' };

const BookingContext = createContext<{
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
} | null>(null);

const STORAGE_KEY = 'booking_state';

const initialState: BookingState = {
  currentStep: BookingStep.Registration,
  data: {
    vehicle: null,
    customer: null,
    timeSlot: null,
    vehicleSize: null,
    selectedDate: null,
    selectedTime: null,
    selectedTimeSlotId: null,
    personalDetails: null,
  },
  error: null,
  loading: false,
  authStatus: { isAuthenticated: false },
  bookingType: null,
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    case 'SET_VEHICLE_DETAILS':
      return {
        ...state,
        data: {
          ...state.data,
          vehicle: action.payload,
        },
      };
    case 'SET_CUSTOMER_DETAILS':
      return {
        ...state,
        data: {
          ...state.data,
          customer: action.payload,
        },
      };
    case 'SET_TIME_SLOT':
      return {
        ...state,
        data: {
          ...state.data,
          timeSlot: action.payload,
        },
      };
    case 'SET_VEHICLE_SIZE':
      return {
        ...state,
        data: {
          ...state.data,
          vehicleSize: action.payload,
        },
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'RESET_BOOKING':
      return initialState;
    case 'SET_AUTH_STATUS':
      return {
        ...state,
        authStatus: action.payload,
      };
    case 'SET_DATE':
      return {
        ...state,
        data: {
          ...state.data,
          selectedDate: action.payload,
        },
      };
    case 'SET_TIME':
      return {
        ...state,
        data: {
          ...state.data,
          selectedTime: action.payload,
        },
      };
    case 'SET_TIME_SLOT_ID':
      return {
        ...state,
        data: {
          ...state.data,
          selectedTimeSlotId: action.payload,
        },
      };
    case 'SET_PERSONAL_DETAILS':
      return {
        ...state,
        data: {
          ...state.data,
          personalDetails: action.payload,
        },
      };
    case 'SET_BOOKING_TYPE':
      return {
        ...state,
        bookingType: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Check auth status on mount and route changes
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: !!user } });
      
      // If authenticated, skip registration step
      if (user && state.currentStep === BookingStep.Registration) {
        dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
      }
    };
    checkAuth();
  }, [supabase, state.currentStep]);

  // Save state to localStorage on changes
  useEffect(() => {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        // Restore all state properties
        Object.entries(parsedState).forEach(([key, value]) => {
          switch (key) {
            case 'currentStep':
              dispatch({ type: 'SET_STEP', payload: value as BookingStep });
              break;
            case 'data':
              const data = value as BookingState['data'];
              if (data.vehicle) dispatch({ type: 'SET_VEHICLE_DETAILS', payload: data.vehicle });
              if (data.customer) dispatch({ type: 'SET_CUSTOMER_DETAILS', payload: data.customer });
              if (data.timeSlot) dispatch({ type: 'SET_TIME_SLOT', payload: data.timeSlot });
              if (data.vehicleSize) dispatch({ type: 'SET_VEHICLE_SIZE', payload: data.vehicleSize });
              if (data.selectedDate) dispatch({ type: 'SET_DATE', payload: data.selectedDate });
              if (data.selectedTime) dispatch({ type: 'SET_TIME', payload: data.selectedTime });
              if (data.selectedTimeSlotId) dispatch({ type: 'SET_TIME_SLOT_ID', payload: data.selectedTimeSlotId });
              if (data.personalDetails) dispatch({ type: 'SET_PERSONAL_DETAILS', payload: data.personalDetails });
              break;
            case 'bookingType':
              dispatch({ type: 'SET_BOOKING_TYPE', payload: value as 'public' | 'dashboard' | null });
              break;
            case 'authStatus':
              dispatch({ type: 'SET_AUTH_STATUS', payload: value as { isAuthenticated: boolean } });
              break;
          }
        });
      } catch (error) {
        console.error('Error loading booking state:', error);
        // On error, reset to initial state
        dispatch({ type: 'RESET' });
      }
    }
  }, []);

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}

// Helper functions
export function isStepComplete(step: BookingStep, data: BookingState['data'], isAuthenticated: boolean): boolean {
  switch (step) {
    case BookingStep.Registration:
      return isAuthenticated || (data.vehicle !== null);
    case BookingStep.PersonalDetails:
      return data.personalDetails !== null;
    case BookingStep.VehicleSize:
      return data.vehicleSize !== null;
    case BookingStep.DateTime:
      return data.selectedTimeSlotId !== null;
    case BookingStep.Summary:
      return data.vehicle !== null && 
             data.vehicleSize !== null && 
             data.selectedTimeSlotId !== null && 
             (isAuthenticated || data.personalDetails !== null);
    default:
      return false;
  }
}

export function getNextStep(currentStep: BookingStep, isAuthenticated: boolean): BookingStep {
  switch (currentStep) {
    case BookingStep.Registration:
      return isAuthenticated ? BookingStep.VehicleSize : BookingStep.PersonalDetails;
    case BookingStep.PersonalDetails:
      return BookingStep.VehicleSize;
    case BookingStep.VehicleSize:
      return BookingStep.DateTime;
    case BookingStep.DateTime:
      return BookingStep.Summary;
    case BookingStep.Summary:
      return BookingStep.Summary;
    default:
      return BookingStep.Registration;
  }
}

export function getPreviousStep(currentStep: BookingStep, isAuthenticated: boolean): BookingStep {
  switch (currentStep) {
    case BookingStep.Registration:
      return BookingStep.Registration;
    case BookingStep.PersonalDetails:
      return BookingStep.Registration;
    case BookingStep.VehicleSize:
      return isAuthenticated ? BookingStep.Registration : BookingStep.PersonalDetails;
    case BookingStep.DateTime:
      return BookingStep.VehicleSize;
    case BookingStep.Summary:
      return BookingStep.DateTime;
    default:
      return BookingStep.Registration;
  }
} 