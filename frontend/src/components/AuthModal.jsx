import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal() {
  const { authOpen, setAuthOpen, signIn, signUp, resetPassword, user } = useAuth();
  const [tab, setTab] = useState('login'); // login | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!authOpen) return null;
  if (user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass rounded-2xl p-6 w-full max-w-sm"
        >
          <div className="text-center">
            <img src="/icon.png" alt="TurboNest" className="w-16 h-16 mx-auto rounded-2xl shadow-turbo mb-4 object-contain" />
            <h2 className="text-xl font-bold">Already Signed In</h2>
            <p className="text-sm opacity-70 mt-1">{user.email}</p>
            <button
              onClick={() => setAuthOpen(false)}
              className="mt-6 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white btn-turbo"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        if (password !== confirm) throw new Error('Passwords do not match');
        await signUp(email, password);
        setSuccess('Account created! Check your email to confirm.');
      } else if (tab === 'login') {
        await signIn(email, password);
        setAuthOpen(false);
      } else if (tab === 'forgot') {
        await resetPassword(email);
        setSuccess('Password reset email sent!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'login', label: 'Sign In' },
    { id: 'signup', label: 'Sign Up' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-backdrop p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass rounded-2xl p-6 w-full max-w-sm relative"
      >
        <button
          onClick={() => setAuthOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          &#10005;
        </button>

        <div className="text-center mb-6">
          <img src="/icon.png" alt="TurboNest" className="w-12 h-12 mx-auto rounded-2xl shadow-turbo mb-3 object-contain" />
          <h2 className="text-xl font-bold">TurboNest</h2>
          <p className="text-xs opacity-60 mt-1">Download Smarter, Faster</p>
        </div>

        {tab !== 'forgot' && (
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="text-xs opacity-60 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50 transition"
                placeholder="you@example.com"
              />
            </div>

            {tab !== 'forgot' && (
              <div>
                <label className="text-xs opacity-60 mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50 transition"
                  placeholder="••••••••"
                />
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <label className="text-xs opacity-60 mb-1.5 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400/50 transition"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-rose-300 text-xs bg-rose-500/10 rounded-lg px-3 py-2"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-emerald-300 text-xs bg-emerald-500/10 rounded-lg px-3 py-2"
              >
                {success}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 text-white font-medium shadow-turbo btn-turbo disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>

            {tab === 'login' && (
              <button
                type="button"
                onClick={() => { setTab('forgot'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs text-slate-400 hover:text-cyan-300 transition"
              >
                Forgot password?
              </button>
            )}

            {tab === 'forgot' && (
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs text-slate-400 hover:text-cyan-300 transition"
              >
                Back to sign in
              </button>
            )}
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
