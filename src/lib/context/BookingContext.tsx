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
import type { VehicleDetails, PersonalDetails, TimeSlot, VehicleSize } from '@/lib/validation/booking';

export enum BookingStep {
  Registration = 'registration',
  PersonalDetails = 'personal-details',
  VehicleSize = 'vehicle-size',
  DateTime = 'date-time',
  Summary = 'summary',
}

interface BookingState {
  currentStep: BookingStep;
  data: {
    vehicle?: VehicleDetails | null;
    customer?: PersonalDetails | null;
    timeSlot?: TimeSlot | null;
    vehicleSize?: VehicleSize | null;
  };
  error: string | null;
  loading: boolean;
  authStatus: { isAuthenticated: boolean };
}

type BookingAction =
  | { type: 'SET_STEP'; payload: BookingStep }
  | { type: 'SET_VEHICLE_DETAILS'; payload: VehicleDetails | null }
  | { type: 'SET_CUSTOMER_DETAILS'; payload: PersonalDetails | null }
  | { type: 'SET_TIME_SLOT'; payload: TimeSlot | null }
  | { type: 'SET_VEHICLE_SIZE'; payload: VehicleSize | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_BOOKING' }
  | { type: 'SET_AUTH_STATUS'; payload: { isAuthenticated: boolean } };

const initialState: BookingState = {
  currentStep: BookingStep.Registration,
  data: {},
  error: null,
  loading: false,
  authStatus: { isAuthenticated: false },
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        error: null,
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

    default:
      return state;
  }
}

const BookingContext = createContext<{
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
} | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // We'll check auth status but not force immediate redirect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Update state with auth status instead of redirecting
      dispatch({ type: 'SET_AUTH_STATUS', payload: { isAuthenticated: !!session } });
    };

    checkAuth();
  }, [supabase.auth]);

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
export function isStepComplete(step: BookingStep, data: BookingState['data']): boolean {
  switch (step) {
    case BookingStep.Registration:
      return !!data.vehicle;
    case BookingStep.PersonalDetails:
      return !!data.customer;
    case BookingStep.VehicleSize:
      return !!data.vehicleSize;
    case BookingStep.DateTime:
      return !!data.timeSlot;
    case BookingStep.Summary:
      return !!(data.vehicle && data.customer && data.vehicleSize && data.timeSlot);
    default:
      return false;
  }
}

export function getNextStep(currentStep: BookingStep): BookingStep {
  switch (currentStep) {
    case BookingStep.Registration:
      return BookingStep.PersonalDetails;
    case BookingStep.PersonalDetails:
      return BookingStep.VehicleSize;
    case BookingStep.VehicleSize:
      return BookingStep.DateTime;
    case BookingStep.DateTime:
      return BookingStep.Summary;
    default:
      return currentStep;
  }
}

export function getPreviousStep(currentStep: BookingStep): BookingStep {
  switch (currentStep) {
    case BookingStep.PersonalDetails:
      return BookingStep.Registration;
    case BookingStep.VehicleSize:
      return BookingStep.PersonalDetails;
    case BookingStep.DateTime:
      return BookingStep.VehicleSize;
    case BookingStep.Summary:
      return BookingStep.DateTime;
    default:
      return currentStep;
  }
} 