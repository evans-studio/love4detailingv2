'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import { 
  Menu, 
  X, 
  Loader2,
  AlertCircle
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || !profile || !['admin', 'staff', 'super_admin'].includes(profile.role))) {
      router.push('/auth/login')
    }
  }, [user, profile, isLoading, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/70">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Unauthorized access
  if (!user || !profile || !['admin', 'staff', 'super_admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-white/70">You need admin privileges to access this area.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
        />
      </div>

      {/* Desktop Layout */}
      <div className="lg:flex lg:h-screen">
        {/* Sidebar */}
        <AdminSidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          className="lg:relative lg:translate-x-0"
        />

        {/* Main Content */}
        <div className="flex-1 lg:overflow-auto">
          {/* Desktop Header */}
          <div className="hidden lg:block">
            <AdminHeader 
              title={title}
              subtitle={subtitle}
            />
          </div>

          {/* Page Content */}
          <main className="admin-content">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}