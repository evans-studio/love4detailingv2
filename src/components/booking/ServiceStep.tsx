'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { serviceSchema, type ServiceInput } from '@/lib/validation/booking';
import { services } from '@/data/services';

export function ServiceStep() {
  const { state, dispatch } = useBooking();
  const selectedServiceId = state.data.serviceId;

  const handleServiceSelect = (serviceId: string) => {
    dispatch({
      type: 'UPDATE_DATA',
      payload: { serviceId },
    });
  };

  const handleNext = () => {
    if (selectedServiceId) {
      dispatch({ type: 'SET_STEP', payload: BookingStep.Vehicle });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`cursor-pointer transition-all ${
              selectedServiceId === service.id
                ? 'ring-2 ring-primary-500'
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleServiceSelect(service.id)}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <span className="text-lg font-bold">£{service.price}</span>
              </div>
              <p className="text-sm text-gray-600">{service.description}</p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Includes:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {service.includes.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <span className="mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Duration:</span> {service.duration}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          onClick={handleNext}
          disabled={!selectedServiceId}
        >
          Continue to Vehicle Details
        </Button>
      </div>
    </div>
  );
} 