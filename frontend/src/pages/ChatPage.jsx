import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSend, FiZap, FiPhone, FiVideo, FiImage, FiMic, FiSquare, FiX } from 'react-icons/fi';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import CallModal from '../components/CallModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { chats, fetchChat, joinChat, sendMessage, sendTyping, fetchStarters, starters, typingUsers, fetchConversations } = useChatStore();

  const [input, setInput] = useState('');
  const [showStarters, setShowStarters] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' | 'video' | null
  const [recording, setRecording] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);

  const chat     = chats[matchId];
  const messages = chat?.messages || [];
  const other    = chat?.participants?.find(p => p._id?.toString() !== user?._id?.toString());
  const isOtherTyping = other && typingUsers[other._id?.toString()];

  useEffect(() => {
    fetchChat(matchId);
    joinChat(matchId);
    fetchStarters(matchId);
    // Mark as read + refresh conversation list to clear badge
    fetchConversations();
  }, [matchId]);

  // Poll every 2s so AI replies always appear even if socket drops
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChat(matchId);
    }, 2000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Text send ──
  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    sendTyping(matchId, false);
    await sendMessage(matchId, text, 'text');
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    sendTyping(matchId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(matchId, false), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Image upload ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const form = new FormData();
      form.append('photos', file);
      const { data } = await api.post('/upload/photos', form);
      const url = data.photos?.[data.photos.length - 1];
      if (url) {
        await sendMessage(matchId, '', 'image', url);
        toast.success('Image sent!');
      }
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingImg(false); e.target.value = ''; }
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunks.current = [];
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        await sendMessage(matchId, '🎤 Voice message', 'voice', url);
        toast.success('Voice message sent!');
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
  };

  const avatar = other?.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || '?')}&background=ec4899&color=fff&size=40`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10 bg-gray-900/90 backdrop-blur shrink-0">
        <button onClick={() => navigate('/chats')}
          className="text-gray-400 hover:text-white transition-colors p-1 -ml-1 shrink-0">
          <FiArrowLeft size={22} />
        </button>

        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-pink-500/30">
          <img src={avatar} alt={other?.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{other?.name || 'Match'}</h3>
          <p className="text-xs text-gray-500">
            {isOtherTyping ? (
              <span className="text-pink-400 animate-pulse">typing...</span>
            ) : other?.verified ? (
              <span className="text-blue-400">✓ Verified</span>
            ) : 'Online'}
          </p>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCallType('voice')}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-green-400 hover:bg-green-500/10 hover:border-green-500/30 transition-all">
            <FiPhone size={16} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCallType('video')}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all">
            <FiVideo size={16} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowStarters(s => !s)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${showStarters ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-yellow-400'}`}>
            <FiZap size={16} />
          </motion.button>
        </div>
      </div>

      {/* ── AI Starters ── */}
      <AnimatePresence>
        {showStarters && starters.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-800/80 border-b border-white/10 px-4 py-3 shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-400 font-semibold">✨ AI Conversation Starters</p>
              <button onClick={() => setShowStarters(false)} className="text-gray-500 hover:text-white">
                <FiX size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {starters.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); setShowStarters(false); }}
                  className="text-left text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors border border-white/5">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4 ring-2 ring-pink-500/30">
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-white font-semibold mb-1">{other?.name || 'Your match'}</p>
            <p className="text-gray-500 text-sm mb-4">Say hello! Tap ⚡ for AI starters.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          // Compare sender as string — handles both ObjectId and plain string
          const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
          const isMe = senderId === user?._id?.toString();
          return (
            <motion.div key={msg._tempId || msg._id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>

              {!isMe && (
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-0.5">
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`max-w-[72%] sm:max-w-[58%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity ${
                  msg._pending ? 'opacity-60' : msg._failed ? 'opacity-40' : 'opacity-100'
                } ${
                  isMe
                    ? `${cx.gradientBrand} text-white rounded-br-sm`
                    : 'bg-white/10 text-white rounded-bl-sm'
                }`}>
                  {msg.type === 'image' && msg.mediaUrl ? (
                    <img src={msg.mediaUrl} alt="shared" className="rounded-xl max-w-full max-h-48 object-cover" />
                  ) : msg.type === 'voice' && msg.mediaUrl ? (
                    <div className="flex items-center gap-2">
                      <FiMic size={14} />
                      <audio controls src={msg.mediaUrl} className="h-8 max-w-[160px]" />
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 px-1 flex items-center gap-1">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''}
                  {isMe && msg._pending && <span className="text-gray-600">·</span>}
                  {isMe && msg._failed && <span className="text-red-500">Failed</span>}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                  animate={{ y: [0,-4,0] }} transition={{ repeat:Infinity, duration:0.8, delay:i*0.15 }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="px-4 sm:px-5 py-3 border-t border-white/10 bg-gray-900/90 backdrop-blur shrink-0">
        <div className="flex gap-2 items-end">

          {/* Image upload */}
          <label className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors shrink-0 ${uploadingImg ? 'opacity-50' : ''}`}>
            <FiImage size={18} className="text-gray-400" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
          </label>

          {/* Voice record */}
          <motion.button whileTap={{ scale: 0.9 }}
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={startRecording} onTouchEnd={stopRecording}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${recording ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-gray-400 hover:text-pink-400'}`}>
            {recording ? <FiSquare size={16} /> : <FiMic size={18} />}
          </motion.button>

          {/* Text input */}
          <textarea
            className={`flex-1 ${cx.inputField} resize-none min-h-[42px] max-h-28 py-2.5 text-sm`}
            placeholder="Type a message..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          {/* Send */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend} disabled={!input.trim()}
            className={`w-10 h-10 ${cx.gradientBrand} rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0`}>
            <FiSend size={17} />
          </motion.button>
        </div>

        {recording && (
          <p className="text-center text-red-400 text-xs mt-2 animate-pulse">
            🔴 Recording... release to send
          </p>
        )}
      </div>

      {/* ── Call modal ── */}
      <AnimatePresence>
        {callType && (
          <CallModal type={callType} other={other} onClose={() => setCallType(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
