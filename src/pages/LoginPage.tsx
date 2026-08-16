import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlowRibbons, BrandMark } from '../components/GlowRibbons';
import { TickerTape } from '../components/TickerTape';
import { easeOut } from '../components/motion';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('buyer@lattice.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setShowForm(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-dvh overflow-hidden relative flex flex-col">
      <GlowRibbons intensity="hero" />

      <header className="relative z-[2] flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-2.5 text-[var(--color-text)]">
          <BrandMark size={22} />
          <span className="font-display text-[20px] tracking-tight">Lattice</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-[var(--color-muted)]">
          <span>Market Data</span>
          <span>Trading Technology</span>
          <span>Trade Execution</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="lattice-btn lattice-btn-ghost text-[13px] py-2 px-4"
            onClick={() => setShowForm(true)}
          >
            Login
          </button>
        </div>
      </header>

      <main className="relative z-[2] flex-1 flex flex-col items-center justify-center px-5 pb-16">
        <motion.div
          className="text-center max-w-3xl"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <h1 className="text-[40px] sm:text-[52px] md:text-[64px] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--color-text)]">
            Financial infrastructure
            <br />
            for <em className="font-normal">compute traders</em>
          </h1>
          <p className="mt-6 text-[16px] md:text-[18px] text-[var(--color-soft)] leading-relaxed max-w-xl mx-auto">
            Price, procure, broker and hedge GPU capacity — with live Ornn, Kalshi and
            macro overlays.
          </p>
        </motion.div>

        {!showForm ? (
          <motion.button
            type="button"
            className="hero-cta mt-10"
            onClick={() => setShowForm(true)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45, ease: easeOut }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.985 }}
          >
            Enter terminal
            <span className="hero-cta-orb">
              <ArrowRight size={14} strokeWidth={2.2} />
            </span>
          </motion.button>
        ) : (
          <motion.form
            onSubmit={onSubmit}
            className="hero-login mt-10 w-full max-w-md"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: easeOut }}
          >
            <label className="text-[13px] block">
              <span className="text-[var(--color-muted)]">Email</span>
              <input
                className="lattice-input mt-1.5 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>
            <label className="text-[13px] block mt-3">
              <span className="text-[var(--color-muted)]">Password</span>
              <input
                type="password"
                className="lattice-input mt-1.5 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && (
              <div className="text-[13px] text-[var(--color-danger)] mt-3">{error}</div>
            )}
            <motion.button
              type="submit"
              disabled={busy}
              className="hero-cta w-full mt-5 justify-center"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
            >
              {busy ? 'Signing in…' : 'Enter terminal'}
              <span className="hero-cta-orb">
                <ArrowRight size={14} strokeWidth={2.2} />
              </span>
            </motion.button>
            <p className="mt-4 text-center text-[11px] text-[var(--color-muted)] leading-relaxed">
              Demo · buyer@lattice.dev · dealer@neocloud.dev · admin@lattice.dev
              <br />
              password123
            </p>
          </motion.form>
        )}
      </main>

      <div className="relative z-[2]">
        <TickerTape />
      </div>
    </div>
  );
}
