import { useAuthStore } from '../../store/authStore';
import { useLanguage } from '../../i18n/useLanguage';
import { DEMO_USERS } from '../../data/seed';


interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact }: RoleSwitcherProps) {
  const { currentUser, switchRole } = useAuthStore();
  const { t, tRole } = useLanguage();

  return (
    <div className={compact ? '' : 'p-3 border-t border-white/10'}>
      {!compact && (
        <p className="text-xs text-green-200/60 uppercase font-600 tracking-wider mb-2 px-1">
          {t('common.switchRole', 'Demo — Switch Role')}
        </p>
      )}
      <div className={compact ? 'flex flex-wrap gap-1' : 'space-y-0.5'}>
        {DEMO_USERS.map(user => (
          <button
            key={user.id}
            onClick={() => switchRole(user.role)}
            className={
              compact
                ? `text-xs px-2 py-1 rounded-full border transition-all ${
                    currentUser?.role === user.role
                      ? 'bg-green-600 border-green-600 text-white font-600'
                      : 'border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-700'
                  }`
                : `sidebar-nav-item w-full text-left text-xs py-1.5 ${
                    currentUser?.role === user.role ? 'active' : ''
                  }`
            }
            title={`Switch to ${user.name} (${user.role})`}
          >
            {tRole(user.role)}
          </button>
        ))}
      </div>
    </div>
  );
}
