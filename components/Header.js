'use client';

import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { ROLE_LABELS } from '@/lib/roles';

const Header = ({ toggleSidebar }) => {
  const { user } = useUser();
  const role = user?.publicMetadata?.role || 'viewer';
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
    : 'Loading…';

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
      <div className="flex items-center justify-between lg:justify-end gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="flex items-center gap-4">
        {/* User Profile */}
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
          </div>
        </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
