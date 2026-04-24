import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiZap, FiShield, FiMessageCircle } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: FiZap, title: 'Smart Matching', desc: 'AI-powered compatibility scoring across 6 dimensions.' },
  { icon: FiMessageCircle, title: 'Real Conversations', desc: 'AI conversation starters to break the ice naturally.' },
  { icon: FiShield, title: 'Safe & Verified', desc: 'Selfie verification and robust reporting tools.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { googleAuth, token, user } = useAuthStore();

  if (token && user?.profileComplete) { navigate('/feed'); return null; }
  if (token && !user?.profileComplete) { navigate('/onboarding'); return null; }

  const handleGoogle = async (cred) => {
    try {
      const data = await googleAuth(cred.credential);
      navigate(data.user.profileComplete ? '/feed' : '/onboarding');
    } catch {
      toast.error('Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Nav bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 ${cx.gradientBrand} rounded-xl flex items-center justify-center`}>
            <FiHeart size={18} className="text-white fill-white" />
          </div>
          <span className={`text-xl font-bold ${cx.gradientText}`}>Spark</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth?mode=login')}
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors px-3 py-2">
            Log In
          </button>
          <button onClick={() => navigate('/auth?mode=register')}
            className={`${cx.btnPrimary} text-sm py-2 px-5`}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center gap-12 px-6 sm:px-10 pt-12 pb-20 max-w-6xl mx-auto">
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex-1 text-center lg:text-left"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            className={`w-16 h-16 sm:w-20 sm:h-20 ${cx.gradientBrand} rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-6 shadow-2xl shadow-pink-500/30`}
          >
            <FiHeart size={32} className="text-white fill-white" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            Find your{' '}
            <span className={cx.gradientText}>real</span>
            <br />connection
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl mb-10 max-w-md mx-auto lg:mx-0">
            Smart matching, real conversations, genuine connections — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start max-w-sm mx-auto lg:mx-0">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/auth?mode=register')}
              className={`${cx.btnPrimary} text-base flex-1 sm:flex-none sm:px-8`}>
              Get Started Free
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/auth?mode=login')}
              className={`${cx.btnSecondary} text-base flex-1 sm:flex-none sm:px-8`}>
              Log In
            </motion.button>
          </div>

          <div className="mt-6 flex items-center gap-3 justify-center lg:justify-start">
            <div className="h-px flex-1 max-w-[80px] bg-white/10" />
            <span className="text-gray-500 text-sm">or continue with</span>
            <div className="h-px flex-1 max-w-[80px] bg-white/10" />
          </div>
          <div className="mt-4 flex justify-center lg:justify-start">
            <GoogleLogin onSuccess={handleGoogle} onError={() => toast.error('Google sign-in failed')}
              theme="filled_black" shape="pill" size="large" text="continue_with" />
          </div>
        </motion.div>

        {/* Right — mock phone card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 flex justify-center lg:justify-end"
        >
          <div className="relative w-64 sm:w-72">
            {/* Phone frame */}
            <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-2xl shadow-pink-500/20 aspect-[9/16]">
              <img
                src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=700&fit=crop"
                alt="demo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5">
                <h3 className="text-xl font-bold">Aria, 28</h3>
                <p className="text-gray-300 text-sm">💼 UX Designer</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['Travel', 'Music', 'Yoga'].map(t => (
                    <span key={t} className="px-2 py-0.5 bg-white/10 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              </div>
              {/* Compatibility badge */}
              <div className={`absolute top-4 right-4 ${cx.gradientBrand} text-white text-xs font-black px-3 py-1 rounded-full`}>
                92%
              </div>
            </div>
            {/* Floating like button */}
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
              className={`absolute -bottom-4 -right-4 w-14 h-14 ${cx.gradientBrand} rounded-full flex items-center justify-center shadow-xl shadow-pink-500/40`}
            >
              <FiHeart size={24} className="text-white fill-white" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 sm:px-10 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className={`${cx.cardGlass} p-6`}
            >
              <div className={`w-10 h-10 ${cx.gradientBrand} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={18} className="text-white" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-gray-400 text-sm">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <p className="text-center text-gray-600 text-xs pb-8">
        By continuing, you agree to our Terms &amp; Privacy Policy
      </p>
    </div>
  );
}
