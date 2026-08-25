// ============================================================
// RoleSwitcher — demo convenience component
// Visible to all in demo mode for hackathon presentation
// ============================================================

import { useAuthStore } from '../../store/authStore';
import { DEMO_USERS } from '../../data/seed';
import type { UserRole } from '../../types';

const ROLE_LABELS: Record<UserRole, string> = {
  farmer:             '🌾 Farmer',
  field_worker:       '🌾 Field Worker',
  paravet:            '💉 Para-vet',
  veterinarian:       '🩺 Veterinarian',
  laboratory:         '🔬 Laboratory',
  lab_tech:           '🔬 Lab Tech',
  government_officer: '🏛 Gov. Officer',
  gov_officer:        '🏛 Gov. Officer',
  admin:              '⚙️ Admin',
};

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact }: RoleSwitcherProps) {
  const { currentUser, switchRole } = useAuthStore();

  return (
    <div className={compact ? '' : 'p-3 border-t border-white/10'}>
      {!compact && (
        <p className="text-xs text-green-200/60 uppercase font-600 tracking-wider mb-2 px-1">
          Demo — Switch Role
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
            {ROLE_LABELS[user.role]}
          </button>
        ))}
      </div>
    </div>
  );
}
