// ============================================================
// Sidebar — desktop navigation
// ============================================================

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Stethoscope, FlaskConical,
  Map, Bell, Settings, ChevronRight, Shield, Syringe,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { RoleSwitcher } from './RoleSwitcher';
import type { UserRole } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['farmer', 'gov_officer', 'admin', 'veterinarian'] },
  { path: '/report',      label: 'Report Incident', icon: FileText,       roles: ['farmer', 'paravet', 'veterinarian', 'admin'] },
  { path: '/cases',       label: 'Case Tracker',  icon: ChevronRight,    roles: ['paravet', 'veterinarian', 'gov_officer', 'admin', 'farmer'] },
  { path: '/vet-console', label: 'Vet Console',   icon: Stethoscope,     roles: ['veterinarian', 'admin'] },
  { path: '/lab-tracker',   label: 'Lab Tracker',         icon: FlaskConical, roles: ['lab_tech', 'veterinarian', 'gov_officer', 'admin'] },
  { path: '/vaccination',   label: 'Vaccination Analytics', icon: Syringe,     roles: ['gov_officer', 'veterinarian', 'lab_tech', 'admin'] },
  { path: '/map',           label: 'Outbreak Map',         icon: Map,          roles: ['gov_officer', 'veterinarian', 'admin', 'paravet'] },
  { path: '/alerts',      label: 'Alerts',         icon: Bell,            roles: ['farmer', 'paravet', 'veterinarian', 'lab_tech', 'gov_officer', 'admin'] },
  { path: '/admin',       label: 'Admin',          icon: Settings,        roles: ['admin'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentUser } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const visibleItems = NAV_ITEMS.filter(item =>
    !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'sidebar',
          isOpen ? 'open' : '',
          'flex flex-col'
        )}
        aria-label="Main navigation"
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-green-400/20 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-green-300" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-800 text-sm leading-tight">Livestock Sentinel</p>
            <p className="text-green-300/60 text-xs">Animal Health Response</p>
          </div>
        </div>

        {/* User info */}
        {currentUser && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-green-200 text-xs font-700">{currentUser.avatarInitials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-600 truncate">{currentUser.name}</p>
                <p className="text-green-300/60 text-xs capitalize">{currentUser.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {visibleItems.map(item => {
              const isAlerts = item.path === '/alerts';
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx('sidebar-nav-item', isActive && 'active')
                    }
                  >
                    <item.icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isAlerts && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Demo role switcher */}
        <RoleSwitcher />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-green-300/40 text-xs text-center">
            Hackathon Prototype · SIH 2025
          </p>
        </div>
      </aside>
    </>
  );
}
