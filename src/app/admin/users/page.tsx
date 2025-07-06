'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { format } from 'date-fns';
import { User, Shield, UserX, Crown } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  bookings_count: number;
  vehicles_count: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // First get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Then get counts for each user
      const usersWithCounts = await Promise.all((usersData || []).map(async (user) => {
        const [{ count: bookingsCount }, { count: vehiclesCount }] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact' }).eq('user_id', user.id),
          supabase.from('vehicles').select('*', { count: 'exact' }).eq('user_id', user.id),
        ]);

        return {
          ...user,
          bookings_count: bookingsCount || 0,
          vehicles_count: vehiclesCount || 0,
        };
      }));

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'customer' | 'admin') => {
    setUpdatingUser(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user role');
    } finally {
      setUpdatingUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState>Loading users...</LoadingState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-[#9146FF]" />
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">User Management</h1>
          <p className="text-[#C7C7C7]">Manage user roles and permissions</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <div className="bg-[#1E1E1E] border-gray-800 rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#F2F2F2]">All Users ({users.length})</h2>
            <Button
              variant="outline"
              onClick={() => fetchUsers()}
              className="text-sm"
            >
              Refresh
            </Button>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-[#C7C7C7]">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">User</th>
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">Stats</th>
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-[#F2F2F2]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-800 hover:bg-[#262626]">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#262626] rounded-full flex items-center justify-center">
                            {user.role === 'admin' ? (
                              <Crown className="h-5 w-5 text-[#9146FF]" />
                            ) : (
                              <User className="h-5 w-5 text-[#9146FF]" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[#F2F2F2]">{user.full_name}</div>
                            <div className="text-sm text-[#C7C7C7]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-[#C7C7C7]">{user.phone || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#262626] text-[#9146FF] rounded-full text-xs font-medium">
                              <Shield className="h-3 w-3" />
                              Admin
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#262626] text-[#C7C7C7] rounded-full text-xs font-medium">
                              <User className="h-3 w-3" />
                              Customer
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-[#F2F2F2]">{user.bookings_count} bookings</div>
                        <div className="text-xs text-[#8B8B8B]">{user.vehicles_count} vehicles</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-[#F2F2F2]">
                          {format(new Date(user.created_at), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateUserRole(user.id, 'customer')}
                              disabled={updatingUser === user.id}
                              className="text-xs"
                            >
                              {updatingUser === user.id ? (
                                <LoadingState size="sm">Removing...</LoadingState>
                              ) : (
                                'Remove Admin'
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateUserRole(user.id, 'admin')}
                              disabled={updatingUser === user.id}
                              className="text-xs"
                            >
                              {updatingUser === user.id ? (
                                <LoadingState size="sm">Promoting...</LoadingState>
                              ) : (
                                'Make Admin'
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 