'use client';

import React from 'react';
import { useAuth } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import content from '@/data/content.json';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UnmatchedVehiclesCard } from '@/components/admin/UnmatchedVehiclesCard';

export default async function DashboardPage() {
  const supabase = createClientComponentClient();
  
  // Get current user and check if admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Booking Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Next Booking</CardTitle>
            <CardDescription>Upcoming appointment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Service</p>
                <p className="text-muted">Premium Detail</p>
              </div>
              <div>
                <p className="font-medium">Vehicle</p>
                <p className="text-muted">BMW M3 (ABC 123)</p>
              </div>
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-muted">Monday, 25th March 2024 at 10:00 AM</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Manage Booking</Button>
          </CardFooter>
        </Card>

        {/* Quick Book Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Book</CardTitle>
            <CardDescription>Book your next appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Registration</label>
                <Input placeholder="Enter registration" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Wash (£30)</SelectItem>
                    <SelectItem value="full">Full Valet (£80)</SelectItem>
                    <SelectItem value="premium">Premium Detail (£150)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Book Now</Button>
          </CardFooter>
        </Card>

        {/* Loyalty Points Card */}
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Points</CardTitle>
            <CardDescription>Your rewards balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-5xl font-bold text-primary-500">150</p>
              <p className="text-sm text-muted mt-2">Points Available</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost">View History</Button>
            <Button variant="outline">Redeem Points</Button>
          </CardFooter>
        </Card>

        {/* Recent Services Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Services</CardTitle>
            <CardDescription>Your service history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Full Valet</p>
                  <p className="text-sm text-muted">15th March 2024</p>
                </div>
                <Button variant="ghost" size="sm">View Details</Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Basic Wash</p>
                  <p className="text-sm text-muted">1st March 2024</p>
                </div>
                <Button variant="ghost" size="sm">View Details</Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="w-full">View All History</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Admin-only section */}
      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UnmatchedVehiclesCard />
            {/* Add other admin cards here */}
          </div>
        </div>
      )}
    </div>
  );
} 