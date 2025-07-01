import { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  TruckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'My Profile - Love4Detailing',
  description: 'Manage your account settings and saved vehicles.',
};

async function getProfileData() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get saved vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('userId', user.id)
    .order('created_at', { ascending: false });

  return {
    profile: profile || {},
    vehicles: vehicles || [],
  };
}

function VehicleCard({ vehicle }: { vehicle: any }) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold">{vehicle.make} {vehicle.model}</h3>
          <p className="text-sm text-gray-600">{vehicle.registration}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href={`/dashboard/profile/vehicles/${vehicle.id}`}>
            Edit
          </Link>
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm">
          <span className="text-gray-600">Year:</span> {vehicle.year}
        </p>
        <p className="text-sm">
          <span className="text-gray-600">Color:</span> {vehicle.color}
        </p>
        <p className="text-sm">
          <span className="text-gray-600">Size:</span>{' '}
          <span className="capitalize">{vehicle.size}</span>
        </p>
      </div>
    </Card>
  );
}

export default async function ProfilePage() {
  const { profile, vehicles } = await getProfileData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600">
          Manage your account settings and saved vehicles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="w-6 h-6 text-gray-600" />
                <div>
                  <h2 className="text-xl font-semibold">Personal Information</h2>
                  <p className="text-sm text-gray-600">Update your personal details</p>
                </div>
              </div>
              <Button asChild>
                <Link href="/dashboard/profile/edit">
                  Edit
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <KeyIcon className="w-6 h-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold">Security</h2>
                <p className="text-sm text-gray-600">Manage your password and security settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/profile/change-password">
                  Change Password
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/profile/two-factor">
                  Two-Factor Authentication
                </Link>
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BellIcon className="w-6 h-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold">Notifications</h2>
                <p className="text-sm text-gray-600">Choose what updates you want to receive</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard/profile/notifications">
                Manage Notification Preferences
              </Link>
            </Button>
          </Card>
        </div>

        {/* Vehicles */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <TruckIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-semibold">Saved Vehicles</h2>
            </div>
            <Button asChild>
              <Link href="/dashboard/profile/vehicles/new">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Vehicle
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            {vehicles.length > 0 ? (
              vehicles.map((vehicle: any) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))
            ) : (
              <Card className="p-6 text-center">
                <p className="text-gray-600 mb-4">No vehicles saved yet</p>
                <Button asChild>
                  <Link href="/dashboard/profile/vehicles/new">
                    Add Your First Vehicle
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 