import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
} 