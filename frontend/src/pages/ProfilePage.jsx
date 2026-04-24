import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiShield, FiStar, FiEdit2, FiCamera, FiX, FiCheck } from 'react-icons/fi';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { cx } from '../lib/cn';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

const INTERESTS_LIST = ['Music','Travel','Fitness','Cooking','Art','Gaming','Reading','Movies','Hiking','Photography','Dancing','Yoga','Coffee','Wine','Sports','Tech','Fashion','Pets'];

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       user.name || '',
    jobTitle:   user.jobTitle || '',
    education:  user.education || '',
    lookingFor: user.lookingFor || '',
    interests:  user.interests || [],
    location:   { city: user.location?.city || '', country: user.location?.country || '' },
    prompts:    user.prompts?.length
      ? user.prompts
      : [{ question:"I'm known for...", answer:'' }, { question:"Perfect weekend...", answer:'' }],
    lifestyle: {
      schedule:    user.lifestyle?.schedule    || '',
      personality: user.lifestyle?.personality || '',
      smoking:     user.lifestyle?.smoking     || '',
      drinking:    user.lifestyle?.drinking    || '',
      workout:     user.lifestyle?.workout     || '',
    }
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNested = (parent, k, v) => setForm(f => ({ ...f, [parent]: { ...f[parent], [k]: v } }));
  const toggleInterest = (i) => set('interests', form.interests.includes(i) ? form.interests.filter(x => x !== i) : [...form.interests, i]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await onSave(form);
      toast.success('Profile updated!');
      onClose();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />

      {/* Sheet */}
      <motion.div
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', damping:28, stiffness:300 }}
        className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
      >
        <div className="pointer-events-auto w-full md:max-w-2xl md:mx-4 bg-gray-900 rounded-t-3xl md:rounded-3xl flex flex-col"
          style={{ maxHeight:'92vh' }}>

          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <FiEdit2 size={18} className="text-pink-400" /> Edit Profile
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><FiX size={22} /></button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Basic */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Basic Info</p>
              <input className={cx.inputField} placeholder="Full name" value={form.name}
                onChange={e => set('name', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={cx.inputField} placeholder="Job Title" value={form.jobTitle}
                  onChange={e => set('jobTitle', e.target.value)} />
                <input className={cx.inputField} placeholder="Education" value={form.education}
                  onChange={e => set('education', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className={cx.inputField} placeholder="City" value={form.location.city}
                  onChange={e => setNested('location','city',e.target.value)} />
                <input className={cx.inputField} placeholder="Country" value={form.location.country}
                  onChange={e => setNested('location','country',e.target.value)} />
              </div>
            </div>

            {/* Intent */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Looking For</p>
              <div className="flex gap-2 flex-wrap">
                {['serious','casual','friendship'].map(v => (
                  <button key={v} onClick={() => set('lookingFor', v)}
                    className={`px-4 py-2 rounded-full border text-sm capitalize transition-all ${form.lookingFor === v ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Interests ({form.interests.length})</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map(i => (
                  <button key={i} onClick={() => toggleInterest(i)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-all ${form.interests.includes(i) ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompts */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Prompts</p>
              {form.prompts.map((p, i) => (
                <div key={i} className={cx.cardGlass + ' p-3'}>
                  <p className="text-pink-400 text-xs mb-1.5">{p.question}</p>
                  <textarea rows={2} placeholder="Your answer..."
                    className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm"
                    value={p.answer}
                    onChange={e => {
                      const prompts = [...form.prompts];
                      prompts[i] = { ...prompts[i], answer: e.target.value };
                      set('prompts', prompts);
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Lifestyle */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Lifestyle</p>
              {[
                { k:'schedule',    opts:['morning','night'] },
                { k:'personality', opts:['introvert','extrovert'] },
                { k:'smoking',     opts:['never','sometimes','often'] },
                { k:'drinking',    opts:['never','sometimes','often'] },
                { k:'workout',     opts:['never','sometimes','often'] },
              ].map(({ k, opts }) => (
                <div key={k}>
                  <p className="text-xs text-gray-500 mb-1.5 capitalize">{k}</p>
                  <div className="flex gap-2 flex-wrap">
                    {opts.map(o => (
                      <button key={o} onClick={() => setNested('lifestyle', k, o)}
                        className={`px-3 py-1.5 rounded-full border text-sm capitalize transition-all ${form.lifestyle[k] === o ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/10 flex gap-3 shrink-0">
            <button onClick={onClose} className={`${cx.btnSecondary} flex-1`}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`${cx.btnPrimary} flex-1`}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout, updateProfile, updateProfileFull } = useAuthStore();
  const { disconnectSocket } = useChatStore();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleLogout = () => { disconnectSocket(); logout(); navigate('/'); };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append('photos', f));
      const { data } = await api.post('/upload/photos', form);
      console.log('[PHOTO UPLOAD] URLs:', data.photos);
      // data.photos is the full updated array from the server
      await updateProfile({ photos: data.photos });
      toast.success('Photo added!');
    } catch (err) {
      console.error('[PHOTO UPLOAD] error:', err);
      toast.error('Upload failed');
    }
    finally { setUploading(false); }
  };

  const [removing, setRemoving] = useState(null); // tracks URL being removed

  const handlePhotoRemove = async (url) => {
    setRemoving(url);
    try {
      const { data } = await api.delete('/upload/photos', { data: { url } });
      await updateProfile({ photos: data.photos });
      toast.success('Photo removed');
    } catch (err) {
      console.error('[PHOTO REMOVE] error:', err);
      // Fallback: remove client-side if backend delete fails (e.g. local storage)
      const updated = (user.photos || []).filter(p => p !== url);
      await updateProfile({ photos: updated });
      toast.success('Photo removed');
    } finally {
      setRemoving(null);
    }
  };

  const handleSaveProfile = async (form) => {
    await updateProfileFull(form);
  };

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const age = user.dob ? Math.floor((Date.now() - new Date(user.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const avatar = user.photos?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=ec4899&color=fff&size=200`;

  return (
    <div className="px-4 sm:px-6 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-xl sm:text-2xl font-bold ${cx.gradientText}`}>Profile</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-pink-500/50 px-3 py-1.5 rounded-xl transition-all">
            <FiEdit2 size={14} /> Edit
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors">
            <FiLogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className={`${cx.cardGlass} p-5 flex items-center gap-4`}>
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-pink-500/40">
                <img src={avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              {user.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">✓</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{user.name}{age ? `, ${age}` : ''}</h2>
              <p className="text-gray-400 text-sm">{user.location?.city || 'Location not set'}</p>
              {user.jobTitle && <p className="text-gray-300 text-sm mt-0.5">💼 {user.jobTitle}</p>}
              <div className="flex items-center gap-1 mt-1.5">
                <FiStar size={13} className="text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">{user.profileScore || 0}% profile</span>
              </div>
            </div>
          </div>

          {/* Profile strength */}
          <div className={`${cx.cardGlass} p-4`}>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Profile Strength</span>
              <span className="text-pink-400 font-medium">{user.profileScore || 0}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className={`h-full ${cx.gradientBrand} rounded-full`}
                initial={{ width:0 }} animate={{ width:`${user.profileScore || 0}%` }} transition={{ duration:0.8 }} />
            </div>
            {(user.profileScore || 0) < 80 && (
              <p className="text-gray-500 text-xs mt-2">Add photos and prompts to boost your score.</p>
            )}
          </div>

          {/* About */}
          <div className={`${cx.cardGlass} p-4 space-y-2`}>
            <h3 className="font-semibold mb-1">About</h3>
            {user.education  && <p className="text-gray-300 text-sm">🎓 {user.education}</p>}
            {user.lookingFor && <p className="text-gray-300 text-sm capitalize">💘 Looking for {user.lookingFor}</p>}
            {user.lifestyle?.schedule && <p className="text-gray-300 text-sm capitalize">🕐 {user.lifestyle.schedule} person</p>}
            {user.interests?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.interests.map(i => (
                  <span key={i} className="px-2.5 py-1 bg-pink-500/15 text-pink-400 rounded-full text-xs border border-pink-500/20">{i}</span>
                ))}
              </div>
            )}
          </div>

          {/* Safety */}
          <div className={`${cx.cardGlass} p-4 flex items-center gap-3`}>
            <FiShield className="text-green-400 shrink-0" size={20} />
            <div>
              <p className="font-medium text-sm">Safety Center</p>
              <p className="text-gray-400 text-xs">Report, block, and stay safe</p>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Photos */}
          <div className={`${cx.cardGlass} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Photos</h3>
              <span className="text-gray-500 text-xs">{user.photos?.length || 0}/6</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(user.photos || []).map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5 relative group">
                  <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ec4899&color=fff&size=200`; }} />
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Main</div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => handlePhotoRemove(url)}
                    disabled={removing === url}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs disabled:opacity-50"
                    title="Remove photo"
                  >
                    {removing === url ? '…' : <FiX size={12} />}
                  </button>
                </div>
              ))}
              {(user.photos?.length || 0) < 6 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors gap-1">
                  <FiCamera size={20} className="text-gray-500" />
                  <span className="text-[10px] text-gray-500">{uploading ? 'Uploading...' : 'Add'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Prompts */}
          {user.prompts?.filter(p => p.answer).length > 0 && (
            <div className={`${cx.cardGlass} p-4 space-y-3`}>
              <h3 className="font-semibold">Prompts</h3>
              {user.prompts.filter(p => p.answer).map((p, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3">
                  <p className="text-pink-400 text-xs mb-1">{p.question}</p>
                  <p className="text-gray-300 text-sm">"{p.answer}"</p>
                </div>
              ))}
            </div>
          )}

          {/* Lifestyle */}
          {user.lifestyle && Object.values(user.lifestyle).some(Boolean) && (
            <div className={`${cx.cardGlass} p-4`}>
              <h3 className="font-semibold mb-3">Lifestyle</h3>
              <div className="grid grid-cols-2 gap-2">
                {[{k:'smoking',label:'Smoking'},{k:'drinking',label:'Drinking'},{k:'workout',label:'Workout'},{k:'personality',label:'Personality'}]
                  .filter(({k}) => user.lifestyle[k])
                  .map(({k,label}) => (
                    <div key={k} className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wide">{label}</p>
                      <p className="text-white text-sm capitalize">{user.lifestyle[k]}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {showEdit && (
          <EditProfileModal user={user} onClose={() => setShowEdit(false)} onSave={handleSaveProfile} />
        )}
      </AnimatePresence>
    </div>
  );
}
