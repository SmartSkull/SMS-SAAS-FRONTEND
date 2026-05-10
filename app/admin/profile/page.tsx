'use client';
import { useAuth } from '@/hooks/useAuth';
import { User } from 'lucide-react';

export default function AdminProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <div className="bg-white rounded-2xl card shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.firstname} {user?.lastname}</p>
            <p className="text-sm text-purple-600 font-medium">Administrator</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          {user?.email && (
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900 font-medium">{user.email}</span>
            </div>
          )}
          {user?.phone && (
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Phone</span>
              <span className="text-gray-900 font-medium">{user.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
