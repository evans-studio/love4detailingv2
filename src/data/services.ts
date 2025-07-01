export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  includes: string[];
}

export const services: Service[] = [
  {
    id: 'basic-wash',
    name: 'Basic Wash & Vacuum',
    description: 'A thorough exterior wash and interior vacuum service.',
    price: 49.99,
    duration: '1.5 hours',
    includes: [
      'Exterior hand wash',
      'Wheel cleaning',
      'Interior vacuum',
      'Dashboard and console wipe down',
      'Window cleaning inside and out',
    ],
  },
  {
    id: 'full-valet',
    name: 'Full Valet Service',
    description: 'Complete interior and exterior detailing with wax protection.',
    price: 149.99,
    duration: '4-5 hours',
    includes: [
      'Everything in Basic Wash',
      'Interior deep clean',
      'Leather/upholstery treatment',
      'Paint decontamination',
      'Machine polish',
      'Wax protection',
      'Tire dressing',
    ],
  },
  {
    id: 'premium-detail',
    name: 'Premium Detailing',
    description: 'Professional detailing with ceramic coating and paint correction.',
    price: 299.99,
    duration: '8-10 hours',
    includes: [
      'Everything in Full Valet',
      'Paint correction',
      'Ceramic coating application',
      'Engine bay cleaning',
      'Paint protection film',
      'Interior sanitization',
      'Headlight restoration',
    ],
  },
];

export const TIME_SLOTS = [
  '09:00',
  '10:30',
  '12:00',
  '13:30',
  '15:00',
  '16:30',
] as const;

export const VEHICLE_SIZES = {
  small: {
    name: 'Small',
    description: 'Compact cars and small hatchbacks',
    examples: ['Ford Fiesta', 'VW Polo', 'Mini Cooper'],
  },
  medium: {
    name: 'Medium',
    description: 'Family cars and medium-sized vehicles',
    examples: ['VW Golf', 'Ford Focus', 'Audi A3'],
  },
  large: {
    name: 'Large',
    description: 'SUVs and large family cars',
    examples: ['Range Rover Sport', 'BMW X5', 'Audi Q7'],
  },
  xl: {
    name: 'Extra Large',
    description: 'Vans and extended wheelbase vehicles',
    examples: ['Mercedes Sprinter', 'Ford Transit', 'VW Transporter'],
  },
} as const; 