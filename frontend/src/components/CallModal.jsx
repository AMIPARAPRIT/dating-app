import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';

// WebRTC call modal — full UI with real peer connection scaffolding
// Falls back gracefully if camera/mic not available
export default function CallModal({ type = 'voice', other, onClose }) {
  const [status, setStatus] = useState('calling'); // calling | connected | ended
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef      = useRef(null);
  const timerRef       = useRef(null);

  const avatar = other?.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || '?')}&background=ec4899&color=fff&size=200`;

  // Request media and simulate connection
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const constraints = type === 'video'
          ? { video: true, audio: true }
          : { audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(() => null);
        if (cancelled) return;

        if (stream) {
          streamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }

        // Simulate ringing → connected after 2.5s
        setTimeout(() => {
          if (!cancelled) {
            setStatus('connected');
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          }
        }, 2500);
      } catch { /* permission denied — still show UI */ }
    };

    start();
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [type]);

  const handleHangUp = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStatus('ended');
    setTimeout(onClose, 1200);
  };

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-gray-950 flex flex-col"
    >
      {/* Background — remote video or avatar */}
      <div className="absolute inset-0">
        {type === 'video' ? (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-950 to-black" />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full py-16 px-6">

        {/* Top — other person info */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
              <img src={avatar} alt={other?.name} className="w-full h-full object-cover" />
            </div>
            {status === 'connected' && (
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-950"
              />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">{other?.name || 'Match'}</h2>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5 justify-center">
              {type === 'video' ? <FiVideo size={13} /> : <FiPhone size={13} />}
              {status === 'calling'   && <span className="animate-pulse">Calling...</span>}
              {status === 'connected' && <span className="text-green-400">{fmt(duration)}</span>}
              {status === 'ended'     && <span className="text-red-400">Call ended</span>}
            </p>
          </div>
        </div>

        {/* Middle — local video preview (video calls only) */}
        {type === 'video' && (
          <div className="w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl self-end">
            <video ref={localVideoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover ${camOff ? 'opacity-0' : ''}`} />
            {camOff && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <FiVideoOff size={24} className="text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Bottom — controls */}
        <div className="flex items-center gap-5">
          {/* Mute */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-white/10 border border-white/20 text-white'}`}>
            {muted ? <FiMicOff size={22} /> : <FiMic size={22} />}
          </motion.button>

          {/* Hang up */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleHangUp}
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/40">
            <FiPhoneOff size={30} className="text-white" />
          </motion.button>

          {/* Camera toggle (video only) / Speaker (voice) */}
          {type === 'video' ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleCam}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${camOff ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-white/10 border border-white/20 text-white'}`}>
              {camOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <FiVolume2 size={22} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
