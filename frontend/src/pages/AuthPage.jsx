import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiEye, FiEyeOff, FiHeart } from 'react-icons/fi';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') || 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { login, register, loading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let data;
      if (mode === 'login') {
        data = await login(form.email, form.password);
      } else {
        if (!form.name) return toast.error('Name is required');
        data = await register(form.name, form.email, form.password);
      }
      navigate(data.user.profileComplete ? '/feed' : '/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel — decorative (lg+) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center bg-gradient-to-br from-rose-900/40 via-pink-900/30 to-purple-900/40">
        <div className="absolute inset-0 bg-gray-950/60" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 text-center px-12">
          <div className={`w-20 h-20 ${cx.gradientBrand} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-pink-500/30`}>
            <FiHeart size={36} className="text-white fill-white" />
          </div>
          <h2 className={`text-4xl font-bold ${cx.gradientText} mb-3`}>Spark</h2>
          <p className="text-gray-400 text-lg">Find your real connection</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col px-6 sm:px-10 py-8 max-w-lg mx-auto w-full lg:max-w-none lg:mx-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white mb-8 w-fit flex items-center gap-2 transition-colors">
          <FiArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-gray-400 mb-8">
              {mode === 'login' ? 'Sign in to continue' : 'Start your journey'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <input
                      className={cx.inputField}
                      placeholder="Full name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                className={cx.inputField}
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />

              <div className="relative">
                <input
                  className={`${cx.inputField} pr-12`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              <button type="submit" disabled={loading} className={`${cx.btnPrimary} w-full mt-2`}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-gray-400 mt-6 text-sm">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
                className="text-pink-400 font-semibold hover:text-pink-300 transition-colors">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
