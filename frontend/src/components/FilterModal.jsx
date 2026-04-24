import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSliders } from 'react-icons/fi';
import { useMatchStore } from '../store/useMatchStore';
import { cx } from '../lib/cn';
import toast from 'react-hot-toast';

const INTERESTS = [
  'Music','Travel','Fitness','Cooking','Art','Gaming','Reading','Movies',
  'Hiking','Photography','Dancing','Yoga','Coffee','Sports','Tech','Fashion','Pets','Wine'
];

// ── Range slider (dual thumb) ─────────────────────────────────────────────────
function RangeSlider({ label, min, max, valueMin, valueMax, onChangeMin, onChangeMax, unit = '' }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="text-pink-400 font-medium">{valueMin}{unit} – {valueMax}{unit}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-white/10 rounded-full" />
        <div
          className={`absolute h-1.5 ${cx.gradientBrand} rounded-full`}
          style={{
            left:  `${((valueMin - min) / (max - min)) * 100}%`,
            right: `${100 - ((valueMax - min) / (max - min)) * 100}%`
          }}
        />
        <input type="range" min={min} max={max} value={valueMin}
          onChange={e => onChangeMin(Math.min(Number(e.target.value), valueMax - 1))}
          className="absolute w-full appearance-none bg-transparent cursor-pointer range-thumb"
          style={{ zIndex: valueMin > max - 10 ? 5 : 3 }}
        />
        <input type="range" min={min} max={max} value={valueMax}
          onChange={e => onChangeMax(Math.max(Number(e.target.value), valueMin + 1))}
          className="absolute w-full appearance-none bg-transparent cursor-pointer range-thumb"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}

// ── Single slider ─────────────────────────────────────────────────────────────
function SingleSlider({ label, min, max, value, onChange, unit = '' }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="text-pink-400 font-medium">{value}{unit}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-white/10 rounded-full" />
        <div className={`absolute h-1.5 ${cx.gradientBrand} rounded-full`}
          style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
        <input type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute w-full appearance-none bg-transparent cursor-pointer range-thumb"
        />
      </div>
    </div>
  );
}

// ── Toggle chip ───────────────────────────────────────────────────────────────
function ToggleChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm transition-all capitalize ${
        active
          ? 'border-pink-500 bg-pink-500/20 text-pink-400'
          : 'border-white/10 text-gray-400 hover:border-white/30'
      }`}
    >
      {label}
    </button>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 pb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex justify-between items-center w-full py-2 text-left"
      >
        <span className="font-semibold text-sm text-white">{title}</span>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main FilterModal ──────────────────────────────────────────────────────────
const DEFAULTS = {
  ageMin: 18, ageMax: 50,
  heightMin: '', heightMax: '',
  distance: 50,
  gender: '',
  interests: [],
  intent: '',
  lifestyle_smoking: '',
  lifestyle_drinking: '',
  lifestyle_workout: '',
  lifestyle_schedule: '',
};

export default function FilterModal({ open, onClose }) {
  const { filters, applyFilters, resetFilters, loading } = useMatchStore();

  const [local, setLocal] = useState({ ...DEFAULTS, ...filters });

  // Sync with store whenever modal opens
  useEffect(() => {
    if (open) setLocal({ ...DEFAULTS, ...filters });
  }, [open]);

  const set = (key, val) => setLocal(f => ({ ...f, [key]: val }));

  const toggleInterest = (i) => {
    const cur = local.interests || [];
    set('interests', cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i]);
  };

  const handleApply = async () => {
    console.log('[FILTER APPLY] Filters:', local);
    const data = await applyFilters(local);
    console.log('[FILTER APPLY] API response:', data);
    toast.success('Filters applied');
    onClose();
  };

  const handleReset = () => {
    resetFilters();
    setLocal({ ...DEFAULTS });
    toast.success('Filters reset');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Sheet — full height on mobile, capped on desktop */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 flex flex-col bg-gray-900 rounded-t-3xl md:rounded-3xl md:bottom-6"
            style={{ height: '100dvh', maxHeight: '92dvh' }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <FiSliders className="text-pink-400" size={18} />
                <h2 className="font-bold text-lg">Filters</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-1 -mr-1">
                <FiX size={22} />
              </button>
            </div>

            {/* ── Scrollable content — pb-32 keeps content above sticky buttons ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-32 space-y-4">

              <Section title="Age Range">
                <RangeSlider
                  label="Age" min={18} max={70}
                  valueMin={local.ageMin} valueMax={local.ageMax}
                  onChangeMin={v => set('ageMin', v)}
                  onChangeMax={v => set('ageMax', v)}
                />
              </Section>

              <Section title="Distance">
                <SingleSlider
                  label="Max Distance" min={5} max={200}
                  value={local.distance}
                  onChange={v => set('distance', v)}
                  unit=" km"
                />
              </Section>

              <Section title="Height" defaultOpen={false}>
                <RangeSlider
                  label="Height" min={140} max={220}
                  valueMin={local.heightMin || 140}
                  valueMax={local.heightMax || 220}
                  onChangeMin={v => set('heightMin', v)}
                  onChangeMax={v => set('heightMax', v)}
                  unit=" cm"
                />
              </Section>

              <Section title="Gender">
                <div className="flex flex-wrap gap-2">
                  {['', 'male', 'female', 'non-binary', 'other'].map(g => (
                    <ToggleChip key={g} label={g || 'Any'} active={local.gender === g}
                      onClick={() => set('gender', g)} />
                  ))}
                </div>
              </Section>

              <Section title="Relationship Intent">
                <div className="flex flex-wrap gap-2">
                  {['', 'serious', 'casual', 'friendship'].map(i => (
                    <ToggleChip key={i} label={i || 'Any'} active={local.intent === i}
                      onClick={() => set('intent', i)} />
                  ))}
                </div>
              </Section>

              <Section title="Interests" defaultOpen={false}>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <ToggleChip key={i} label={i}
                      active={(local.interests || []).includes(i)}
                      onClick={() => toggleInterest(i)} />
                  ))}
                </div>
              </Section>

              <Section title="Lifestyle" defaultOpen={false}>
                <div className="space-y-3">
                  {[
                    { key: 'lifestyle_smoking',  label: 'Smoking',  opts: ['never','sometimes','often'] },
                    { key: 'lifestyle_drinking', label: 'Drinking', opts: ['never','sometimes','often'] },
                    { key: 'lifestyle_workout',  label: 'Workout',  opts: ['never','sometimes','often'] },
                    { key: 'lifestyle_schedule', label: 'Schedule', opts: ['morning','night'] },
                  ].map(({ key, label, opts }) => (
                    <div key={key}>
                      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        <ToggleChip label="Any" active={!local[key]} onClick={() => set(key, '')} />
                        {opts.map(o => (
                          <ToggleChip key={o} label={o} active={local[key] === o}
                            onClick={() => set(key, o)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

            </div>

            {/* ── Sticky footer buttons — always visible, safe-area aware ── */}
            <div
              className="sticky bottom-0 left-0 w-full shrink-0 bg-gray-900 border-t border-white/10 px-5 py-3 flex gap-3"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={handleReset}
                className={`${cx.btnSecondary} flex-1`}
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className={`${cx.btnPrimary} flex-1`}
              >
                {loading ? 'Applying…' : 'Apply Filters'}
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
