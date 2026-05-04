import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  CreditCard,
  UsersRound,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Building2 },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: UsersRound },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

export default function Sidebar({ open, setOpen }) {
  const { organization } = useAuthStore();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PropMind AI</h1>
              {organization && (
                <p className="text-xs text-gray-500 truncate max-w-[150px]">
                  {organization.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
              onClick={() => setOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Plan Badge */}
        {organization && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary-900">
                  {organization.plan.toUpperCase()} Plan
                </span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  organization.subscription.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                )}>
                  {organization.subscription.status}
                </span>
              </div>
              <div className="text-xs text-primary-700">
                {organization.usage.monthlyQueryCount} / {organization.limits.monthlyQueryLimit} queries
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary-600 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(
                      (organization.usage.monthlyQueryCount / organization.limits.monthlyQueryLimit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
