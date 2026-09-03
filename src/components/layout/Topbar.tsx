// ============================================================
// Topbar — sticky top navigation bar
// ============================================================

import { Bell, Menu, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useLanguage } from '../../i18n/useLanguage';
import { RoleSwitcher } from './RoleSwitcher';
import { LanguageSelector } from './LanguageSelector';

interface TopbarProps {
  onMenuToggle: () => void;
  isOnline?: boolean;
}

export function Topbar({ onMenuToggle, isOnline = true }: TopbarProps) {
  const { currentUser, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { t, tRole } = useLanguage();
  const navigate = useNavigate();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Mobile menu toggle */}
      <button
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={onMenuToggle}
        aria-label={t('common.toggleNavigation', 'Toggle navigation')}
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Page title area — desktop only */}
      <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
        <span className="text-green-700 font-700">{t('common.appName', 'Livestock Sentinel')}</span>
        <span className="text-gray-300">|</span>
        <span>{t('common.appSubtitle', 'Animal Health Response System')}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global Multilingual Selector */}
      <LanguageSelector variant="header" />

      {/* Connectivity indicator */}
      <div className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-2 flex-shrink-0" title={isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}>
        {isOnline
          ? <Wifi size={14} className="text-green-500 flex-shrink-0" />
          : <WifiOff size={14} className="text-amber-500 flex-shrink-0" />
        }
        <span className={`hidden sm:inline text-xs font-500 ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
          {isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
        </span>
      </div>

      {/* Notifications */}
      <button
        onClick={() => navigate('/alerts')}
        className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
        aria-label={`${t('common.notifications', 'Notifications')}${unreadCount > 0 ? ` (${unreadCount} ${t('common.unread', 'unread')})` : ''}`}
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-700 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* User avatar / role switcher */}
      {currentUser && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowRoleSwitcher(s => !s)}
            className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={t('common.userMenu', 'User menu')}
          >
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 text-xs font-700">{currentUser.avatarInitials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-600 text-gray-800 leading-tight">{currentUser.name}</p>
              <p className="text-xs text-gray-400 capitalize leading-tight">{tRole(currentUser.role)}</p>
            </div>
          </button>

          {/* Dropdown */}
          {showRoleSwitcher && (
            <div className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3">
              <p className="text-xs font-700 text-gray-500 uppercase tracking-wider mb-2">
                {t('common.switchRole', 'Demo: Switch Role')}
              </p>
              <RoleSwitcher compact />
              <hr className="my-2 border-gray-100" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                {t('common.logout', 'Sign Out')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
