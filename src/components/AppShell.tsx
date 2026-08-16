import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  ClipboardList,
  Columns3,
  Gavel,
  LayoutDashboard,
  LogOut,
  Radio,
  Server,
  Shield,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { BrandMark, GlowRibbons } from './GlowRibbons';
import { easeOut } from './motion';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors border-l-2 ${
    isActive
      ? 'border-[var(--color-live)] text-[var(--color-text)] bg-[var(--lattice-hover)]'
      : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-soft)] hover:bg-[var(--lattice-hover)]'
  }`;

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDealer = user?.role === 'provider_dealer';
  const isBuyer = user?.role === 'buyer' || user?.role === 'admin';

  return (
    <motion.div
      className="h-dvh max-h-dvh overflow-hidden grid grid-cols-[220px_1fr] relative z-[1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: easeOut }}
    >
      <motion.aside
        className="h-dvh sticky top-0 border-r border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-md flex flex-col overflow-hidden"
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <div className="px-5 pt-6 pb-5 border-b border-[var(--color-line)] shrink-0">
          <div className="flex items-center gap-2 text-[var(--color-text)]">
            <BrandMark size={20} />
            <span className="font-display text-[22px] tracking-tight">Lattice</span>
          </div>
          <div className="text-[11px] text-[var(--color-muted)] mt-1 tracking-[0.08em] uppercase">
            Compute Terminal
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 py-4 px-2 flex-1 overflow-y-auto min-h-0">
          <NavLink to="/pipeline" className={linkClass}>
            <Columns3 size={15} strokeWidth={1.5} /> Pipeline
          </NavLink>
          <NavLink to="/overview" className={linkClass}>
            <LayoutDashboard size={15} strokeWidth={1.5} /> Overview
          </NavLink>
          {isBuyer && (
            <NavLink to="/rfq" className={linkClass}>
              <Gavel size={15} strokeWidth={1.5} /> RFQ Desk
            </NavLink>
          )}
          <NavLink to="/orders" className={linkClass}>
            <ClipboardList size={15} strokeWidth={1.5} /> Orders
          </NavLink>
          <NavLink to="/portfolio" className={linkClass}>
            <BookOpen size={15} strokeWidth={1.5} /> Portfolio
          </NavLink>
          <NavLink to="/market-data" className={linkClass}>
            <Radio size={15} strokeWidth={1.5} /> Market Data
          </NavLink>
          <NavLink to="/audit" className={linkClass}>
            <Shield size={15} strokeWidth={1.5} /> Audit
          </NavLink>
          {isDealer && (
            <NavLink to="/dealer" className={linkClass}>
              <Server size={15} strokeWidth={1.5} /> Dealer Desk
            </NavLink>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-[var(--color-line)] shrink-0">
          <div className="text-[13px] text-[var(--color-soft)] truncate">{user?.orgName}</div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
            {user?.name} · <span className="font-mono">{user?.role}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <ThemeToggle />
            <motion.button
              type="button"
              onClick={logout}
              className="lattice-btn lattice-btn-ghost flex-1 text-xs"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut size={13} strokeWidth={1.5} /> Sign out
            </motion.button>
          </div>
        </div>
      </motion.aside>

      <main className="h-dvh min-h-0 overflow-y-auto relative z-[1]">
        <GlowRibbons intensity="subtle" />
        <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg)_78%,transparent)] backdrop-blur-md px-8 py-3.5 flex items-center justify-between">
          <div>
            <div className="text-[12px] text-[var(--color-muted)]">
              Financial infrastructure for{' '}
              <em className="text-[var(--color-soft)]">compute traders</em>
            </div>
            <div className="text-[14px] text-[var(--color-soft)] mt-0.5">
              Connectivity · Execution · Market data
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-[var(--color-muted)]">
              <span className="lattice-live">▲ ORNN-H100</span>
              <span className="opacity-40">·</span>
              <span className="lattice-live">▲ CIBLKWUS</span>
              <span className="opacity-40">·</span>
              <span>▲ KALSHI</span>
            </div>
            <div className="ticker flex items-center gap-1.5">
              <motion.span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-live)]"
                animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              Live feeds
            </div>
            <div className="text-[11px] font-mono text-[var(--color-muted)]">{user?.email}</div>
            <ThemeToggle />
          </div>
        </header>
        <div className="p-8 relative z-[1]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}
