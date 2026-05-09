import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  History as HistoryIcon,
  Settings,
  Trophy,
  X,
  LogOut,
} from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, labels: { en: 'Dashboard', tk: 'Dolandyryş', ru: 'Панель', tr: 'Panel' } },
  { href: '/admin/tables', icon: Grid3X3, labels: { en: 'Tables', tk: 'Stollar', ru: 'Столы', tr: 'Masalar' } },
  { href: '/admin/history', icon: HistoryIcon, labels: { en: 'History', tk: 'Taryh', ru: 'История', tr: 'Gecmis' } },
  { href: '/admin/menu', icon: UtensilsCrossed, labels: { en: 'Menu', tk: 'Menýu', ru: 'Меню', tr: 'Menu' } },
  { href: '/admin/best-sellers', icon: Trophy, labels: { en: 'Best Sellers', tk: 'Meşhur', ru: 'Хиты', tr: 'Cok Satanlar' } },
  { href: '/admin/settings', icon: Settings, labels: { en: 'Settings', tk: 'Sazlamalar', ru: 'Настройки', tr: 'Ayarlar' } },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAdminStore();
  const { language } = useCartStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/admin');
  };

  const labels = {
    logout: { en: 'Logout', tk: 'Çykyş', ru: 'Выход', tr: 'Cikis' },
    adminPanel: { en: 'Admin Panel', tk: 'Admin Paneli', ru: 'Админ Панель', tr: 'Admin Paneli' }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Logo */}
      <div className="p-6 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-[12px] flex items-center justify-center shadow-lg shadow-orange-600/20">
            <UtensilsCrossed size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg dark:text-white">QR Menu</h2>
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
              {labels.adminPanel[language as keyof typeof labels.adminPanel] || labels.adminPanel.en}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const label = item.labels[language as keyof typeof item.labels] || item.labels.en;
          
          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div className="relative group">
                {isActive && (
                  <>
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-orange-600/5 dark:bg-orange-500/10 rounded-2xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-orange-600 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  </>
                )}
                <div
                  className={`relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'text-orange-600 dark:text-orange-400 font-black'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon 
                    size={20} 
                    className={`transition-all duration-300 ${
                      isActive 
                        ? 'text-orange-600 scale-110' 
                        : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                    }`} 
                  />
                  <span className="text-[13px] tracking-tight">{label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-zinc-50 dark:bg-white/5 rounded-2xl">
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-bold border border-orange-200 dark:border-orange-500/30">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate dark:text-white">{user?.name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-sm font-medium"
        >
          <LogOut size={18} />
          <span>{labels.logout[language as keyof typeof labels.logout] || labels.logout.en}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-950 border-r border-black/5 dark:border-white/5 z-40 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-950 border-r border-black/10 dark:border-white/10 z-50 lg:hidden shadow-2xl"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-500"
              >
                <X size={20} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
