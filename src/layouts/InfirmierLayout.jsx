import { BellRing } from 'lucide-react';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { to: '/infirmier', label: 'Alertes', icon: BellRing, end: true },
];

export default function InfirmierLayout({ children }) {
  return (
    <RoleLayout navItems={NAV_ITEMS} roleLabel="Espace infirmier(e)">
      {children}
    </RoleLayout>
  );
}
