import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import toast from 'react-hot-toast';
import api from '../lib/api';

const TOTAL_STEPS = 9;
const INTERESTS = ['Music', 'Travel', 'Fitness', 'Cooking', 'Art', 'Gaming', 'Reading', 'Movies', 'Hiking', 'Photography', 'Dancing', 'Yoga', 'Coffee', 'Wine', 'Sports', 'Tech', 'Fashion', 'Pets'];
const PROMPTS = ["I'm known for...", "Perfect weekend...", "Text me if..."];

export default function OnboardingPage() {
  const { user, saveOnboarding } = useAuthStore();
  const [step, setStep] = useState(user?.onboardingStep || 1);
  const [initialized, setInitialized] = useState(false);
  const [data, setData] = useState({
    name: user?.name || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    dobDay: user?.dob ? new Date(user.dob).getDate().toString() : '',
    dobMonth: user?.dob ? (new Date(user.dob).getMonth() + 1).toString() : '',
    dobYear: user?.dob ? new Date(user.dob).getFullYear().toString() : '',
    gender: user?.gender || '',
    interestedIn: user?.interestedIn || [],
    location: { city: user?.location?.city || '', country: user?.location?.country || '' },
    height: user?.height || '',
    bodyType: user?.bodyType || '',
    education: user?.education || '',
    jobTitle: user?.jobTitle || '',
    lookingFor: user?.lookingFor || '',
    interests: user?.interests || [],
    lifestyle: {
      schedule: user?.lifestyle?.schedule || '',
      personality: user?.lifestyle?.personality || '',
      smoking: user?.lifestyle?.smoking || '',
      drinking: user?.lifestyle?.drinking || '',
      workout: user?.lifestyle?.workout || ''
    },
    prompts: user?.prompts?.length ? user.prompts : PROMPTS.map(q => ({ question: q, answer: '' })),
    photos: user?.photos || []
  });

  useEffect(() => {
    if (user && !initialized) {
      setStep(user.onboardingStep || 1);
      setData(d => ({
        ...d,
        name: user.name || d.name,
        ...(user.gender && { gender: user.gender }),
        ...(user.location?.city && { location: { city: user.location.city, country: user.location.country || '' } })
      }));
      setInitialized(true);
    }
  }, [user, initialized]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (step > 1 && step <= TOTAL_STEPS) {
      setSaving(true);
      saveOnboarding({ ...data, onboardingStep: step })
        .catch(e => console.error('Auto-save failed:', e))
        .finally(() => setSaving(false));
    }
  }, [step]);

  const validateStep = (s) => {
    switch (s) {
      case 1: {
        if (!data.name || !data.dob || !data.gender || !data.interestedIn.length || !data.location.city)
          return toast.error('Please fill in all basic info'), false;
        const age = Math.floor((Date.now() - new Date(data.dob)) / 31557600000);
        if (age < 18) return toast.error('You must be at least 18'), false;
        if (age > 100) return toast.error('Invalid date of birth'), false;
        return true;
      }
      case 2:
        if (!data.height || !data.bodyType) return toast.error('Please complete about you'), false;
        return true;
      case 3:
        if (!data.education || !data.jobTitle || !data.lookingFor) return toast.error('Please fill in education and intent'), false;
        return true;
      case 4:
        if (data.interests.length < 3) return toast.error('Pick at least 3 interests'), false;
        return true;
      case 5: {
        const { schedule, personality, smoking, drinking, workout } = data.lifestyle;
        if (!schedule || !personality || !smoking || !drinking || !workout) return toast.error('Please complete lifestyle info'), false;
        return true;
      }
      case 6:
        if (data.prompts.some(p => !p.answer)) return toast.error('Please answer all prompts'), false;
        return true;
      default: return true;
    }
  };

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));
  const setNested = (parent, key, val) => setData(d => ({ ...d, [parent]: { ...d[parent], [key]: val } }));
  const next = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append('photos', f));
      const { data: res } = await api.post('/upload/photos', form);
      const newPhotos = [...data.photos, ...res.photos];
      setData(d => ({ ...d, photos: newPhotos }));
      await saveOnboarding({ photos: newPhotos });
      toast.success('Photos uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleFinish = async () => {
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      await saveOnboarding({ ...data, onboardingStep: TOTAL_STEPS, profileComplete: true });
      toast.success('Profile complete!');
      navigate('/feed');
    } catch { toast.error('Failed to save profile'); }
    finally { setSaving(false); }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <div className="flex items-center gap-2">
              <span>Step {step} of {TOTAL_STEPS}</span>
              {saving && (
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-[10px] uppercase tracking-widest text-pink-500">Saving...</motion.span>
              )}
            </div>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${cx.gradientBrand} rounded-full`}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.35 }}
          >
            {step === 1 && <Step1 data={data} set={set} setNested={setNested} />}
            {step === 2 && <Step2 data={data} set={set} />}
            {step === 3 && <Step3 data={data} set={set} />}
            {step === 4 && <Step4 data={data} set={set} />}
            {step === 5 && <Step5 data={data} setNested={setNested} />}
            {step === 6 && <Step6 data={data} setData={setData} />}
            {step === 7 && <Step7 data={data} onUpload={handlePhotoUpload} uploading={uploading} />}
            {step === 8 && <Step8 />}
            {step === 9 && <Step9 data={data} />}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={back} className={`${cx.btnSecondary} flex-1`}>Back</button>
          )}
          {step < TOTAL_STEPS
            ? <button onClick={next} className={`${cx.btnPrimary} flex-1`}>Continue</button>
            : <button onClick={handleFinish} disabled={saving} className={`${cx.btnPrimary} flex-1`}>
                {saving ? 'Saving...' : 'Complete Profile'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

/* ── Step components ── */

function Step1({ data, set, setNested }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i);

  const updateDob = (key, val) => {
    const nd = { ...data, [key]: val };
    if (nd.dobDay && nd.dobMonth && nd.dobYear) {
      set('dob', `${nd.dobYear}-${String(nd.dobMonth).padStart(2,'0')}-${String(nd.dobDay).padStart(2,'0')}`);
    }
    set(key, val);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Basic Info</h2>
      <input className={cx.inputField} placeholder="Full name" value={data.name} onChange={e => set('name', e.target.value)} />

      <div>
        <label className="text-sm text-gray-400 mb-1.5 block">Date of Birth</label>
        <div className="grid grid-cols-3 gap-2">
          <select className={cx.inputField} value={data.dobDay} onChange={e => updateDob('dobDay', e.target.value)}>
            <option value="">Day</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className={cx.inputField} value={data.dobMonth} onChange={e => updateDob('dobMonth', e.target.value)}>
            <option value="">Month</option>
            {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select className={cx.inputField} value={data.dobYear} onChange={e => updateDob('dobYear', e.target.value)}>
            <option value="">Year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">Must be 18+ to join</p>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Gender</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['male','female','non-binary','other'].map(g => (
            <button key={g} onClick={() => set('gender', g)}
              className={`py-2.5 rounded-xl border capitalize text-sm transition-all ${data.gender === g ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Interested In</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['male','female','non-binary','everyone'].map(g => (
            <button key={g} onClick={() => {
              const cur = data.interestedIn;
              set('interestedIn', cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]);
            }}
              className={`py-2.5 rounded-xl border capitalize text-sm transition-all ${data.interestedIn.includes(g) ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={cx.inputField} placeholder="City" value={data.location.city} onChange={e => setNested('location','city',e.target.value)} />
        <input className={cx.inputField} placeholder="Country" value={data.location.country} onChange={e => setNested('location','country',e.target.value)} />
      </div>
    </div>
  );
}

function Step2({ data, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">About You</h2>
      <input className={cx.inputField} placeholder="Height (cm)" type="number" value={data.height} onChange={e => set('height', e.target.value)} />
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Body Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['slim','athletic','average','curvy','plus-size'].map(b => (
            <button key={b} onClick={() => set('bodyType', b)}
              className={`py-2.5 rounded-xl border capitalize text-sm transition-all ${data.bodyType === b ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
              {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ data, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Education & Intent</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input className={cx.inputField} placeholder="Education (e.g. Bachelor's)" value={data.education} onChange={e => set('education', e.target.value)} />
        <input className={cx.inputField} placeholder="Job Title" value={data.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Looking for</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[{v:'serious',l:'Serious Relationship'},{v:'casual',l:'Casual Dating'},{v:'friendship',l:'Friendship'}].map(({v,l}) => (
            <button key={v} onClick={() => set('lookingFor', v)}
              className={`py-3 rounded-xl border text-sm text-left px-4 transition-all ${data.lookingFor === v ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4({ data, set }) {
  const toggle = i => set('interests', data.interests.includes(i) ? data.interests.filter(x => x !== i) : [...data.interests, i]);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Interests</h2>
      <p className="text-gray-400 text-sm">Pick at least 3 — {data.interests.length} selected</p>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map(i => (
          <button key={i} onClick={() => toggle(i)}
            className={`px-4 py-2 rounded-full border text-sm transition-all ${data.interests.includes(i) ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step5({ data, setNested }) {
  const opts = {
    schedule: ['morning','night'],
    personality: ['introvert','extrovert'],
    smoking: ['never','sometimes','often'],
    drinking: ['never','sometimes','often'],
    workout: ['never','sometimes','often'],
  };
  return (
    <div className="space-y-5">
      <h2 className="text-2xl sm:text-3xl font-bold">Lifestyle</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {Object.entries(opts).map(([key, vals]) => (
          <div key={key}>
            <label className="text-sm text-gray-400 mb-2 block capitalize">{key}</label>
            <div className="flex gap-2 flex-wrap">
              {vals.map(v => (
                <button key={v} onClick={() => setNested('lifestyle', key, v)}
                  className={`px-4 py-2 rounded-full border text-sm capitalize transition-all ${data.lifestyle[key] === v ? 'border-pink-500 bg-pink-500/20 text-pink-400' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step6({ data, setData }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Your Prompts</h2>
      <p className="text-gray-400 text-sm">Let people know the real you</p>
      <div className="space-y-3">
        {data.prompts.map((p, i) => (
          <div key={i} className={`${cx.cardGlass} p-4`}>
            <p className="text-pink-400 text-sm mb-2">{p.question}</p>
            <textarea
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm"
              rows={2} placeholder="Your answer..."
              value={p.answer}
              onChange={e => setData(d => {
                const prompts = [...d.prompts];
                prompts[i] = { ...prompts[i], answer: e.target.value };
                return { ...d, prompts };
              })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Step7({ data, onUpload, uploading }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Add Photos</h2>
      <p className="text-gray-400 text-sm">2–6 photos recommended ({data.photos.length} uploaded)</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {data.photos.map((url, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {data.photos.length < 6 && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors gap-1">
            <span className="text-2xl text-gray-500">+</span>
            <span className="text-[10px] text-gray-500">{uploading ? 'Uploading...' : 'Add photo'}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
        )}
      </div>
    </div>
  );
}

function Step8() {
  return (
    <div className="space-y-4 text-center py-4">
      <div className={`w-20 h-20 ${cx.gradientBrand} rounded-full flex items-center justify-center mx-auto text-3xl`}>✓</div>
      <h2 className="text-2xl sm:text-3xl font-bold">Verification</h2>
      <p className="text-gray-400 max-w-sm mx-auto">Take a selfie to get your verified badge. This helps build trust in the community.</p>
      <button className={`${cx.btnPrimary} mx-auto`}>Take Selfie (Optional)</button>
    </div>
  );
}

function Step9({ data }) {
  const age = data.dob ? Math.floor((Date.now() - new Date(data.dob)) / 31557600000) : null;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold">Profile Preview</h2>
      <div className={`${cx.cardGlass} p-4 space-y-3`}>
        {data.photos[0] && (
          <img src={data.photos[0]} alt="" className="w-full h-48 sm:h-64 object-cover rounded-xl" />
        )}
        <div>
          <h3 className="text-xl font-bold">{data.name || 'Your Name'}{age ? `, ${age}` : ''}</h3>
          <p className="text-gray-400 text-sm">{data.location.city}{data.location.country ? `, ${data.location.country}` : ''}</p>
        </div>
        {data.jobTitle && <p className="text-gray-300 text-sm">💼 {data.jobTitle}</p>}
        {data.lookingFor && <p className="text-pink-400 text-sm capitalize">Looking for: {data.lookingFor}</p>}
        {data.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.interests.slice(0, 6).map(i => (
              <span key={i} className="px-2.5 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs">{i}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
