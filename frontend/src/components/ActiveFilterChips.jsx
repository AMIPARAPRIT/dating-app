import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useMatchStore } from '../store/useMatchStore';

const DEFAULTS = {
  age:               { ageMin: 18, ageMax: 50 },
  distance:          { distance: 50 },
  gender:            { gender: '' },
  intent:            { intent: '' },
  interests:         { interests: [] },
  lifestyle_smoking: { lifestyle_smoking: '' },
  lifestyle_drinking:{ lifestyle_drinking: '' },
  lifestyle_workout: { lifestyle_workout: '' },
  lifestyle_schedule:{ lifestyle_schedule: '' },
};

export default function ActiveFilterChips({ onOpenFilter }) {
  const { filters, applyFilters, fetchFeed, activeFilterCount } = useMatchStore();

  if (activeFilterCount === 0) return null;

  const chips = [];
  if (filters.ageMin !== 18 || filters.ageMax !== 50)
    chips.push({ key: 'age', label: `${filters.ageMin}–${filters.ageMax} yrs` });
  if (filters.distance !== 50)
    chips.push({ key: 'distance', label: `≤${filters.distance} km` });
  if (filters.gender)
    chips.push({ key: 'gender', label: filters.gender });
  if (filters.intent)
    chips.push({ key: 'intent', label: filters.intent });
  if (filters.interests?.length)
    chips.push({ key: 'interests', label: `${filters.interests.length} interest${filters.interests.length > 1 ? 's' : ''}` });
  if (filters.lifestyle_smoking)
    chips.push({ key: 'lifestyle_smoking', label: `smoking: ${filters.lifestyle_smoking}` });
  if (filters.lifestyle_drinking)
    chips.push({ key: 'lifestyle_drinking', label: `drinking: ${filters.lifestyle_drinking}` });
  if (filters.lifestyle_workout)
    chips.push({ key: 'lifestyle_workout', label: `workout: ${filters.lifestyle_workout}` });
  if (filters.lifestyle_schedule)
    chips.push({ key: 'lifestyle_schedule', label: filters.lifestyle_schedule });

  const removeChip = (key) => {
    const reset = DEFAULTS[key] || {};
    const updated = { ...filters, ...reset };
    // Check if any non-default filters remain after removal
    const stillActive = Object.entries(updated).some(([k, v]) => {
      if (k === 'ageMin') return v !== 18;
      if (k === 'ageMax') return v !== 50;
      if (k === 'distance') return v !== 50;
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== null && v !== undefined;
    });
    if (stillActive) {
      applyFilters(reset); // applyFilters merges with existing
    } else {
      // All filters cleared — go back to regular feed
      applyFilters(reset).then(() => fetchFeed());
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <AnimatePresence>
        {chips.map(chip => (
          <motion.div
            key={chip.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
          >
            <span className="capitalize">{chip.label}</span>
            <button onClick={() => removeChip(chip.key)} className="ml-0.5 hover:text-white transition-colors">
              <FiX size={11} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
