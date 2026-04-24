/**
 * Dynamic Weighted Matching Engine
 * System auto-adapts weights based on user behavior (Likes/Passes).
 * Weights: interest, intent, lifestyle, age, profile.
 */

function getAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const ageDice = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageDice);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Normalizes user weights to ensure they always sum to 100.
 */
function normalizeWeights(p) {
  const total =
    p.interestWeight +
    p.intentWeight +
    p.lifestyleWeight +
    p.ageWeight +
    p.profileWeight;

  if (total === 0) {
    p.interestWeight = 40;
    p.intentWeight = 20;
    p.lifestyleWeight = 20;
    p.ageWeight = 10;
    p.profileWeight = 10;
    return;
  }

  p.interestWeight = (p.interestWeight / total) * 100;
  p.intentWeight = (p.intentWeight / total) * 100;
  p.lifestyleWeight = (p.lifestyleWeight / total) * 100;
  p.ageWeight = (p.ageWeight / total) * 100;
  p.profileWeight = (p.profileWeight / total) * 100;
}

/**
 * Updates weights based on user actions.
 * @param {Object} currentUser - The user performing the action.
 * @param {Object} targetUser - The user being acted upon.
 * @param {String} action - 'like' or 'pass'.
 */
export async function updateDynamicWeights(currentUser, targetUser, action) {
  const p = currentUser.preferences;

  if (action === 'like') {
    // Interests match -> +2
    const common = (targetUser.interests || []).some(i => 
      (currentUser.interests || []).includes(i)
    );
    if (common) p.interestWeight += 2;

    // Intent match -> +2
    if (targetUser.lookingFor === currentUser.lookingFor) {
      p.intentWeight += 2;
    }

    // Lifestyle (Personality) match -> +1
    if (targetUser.lifestyle?.personality === currentUser.lifestyle?.personality) {
      p.lifestyleWeight += 1;
    }
  } else if (action === 'pass') {
    // Reduce matching factors slightly on pass
    p.interestWeight = Math.max(1, p.interestWeight - 1);
    p.intentWeight = Math.max(1, p.intentWeight - 1);
  }

  normalizeWeights(p);
  
  // Save the changes (currentUser should be a Mongoose document)
  if (typeof currentUser.save === 'function') {
    await currentUser.save();
  }
}

/**
 * Calculates compatibility score using dynamic weights.
 */
export function calculateCompatibility(user, currentUser) {
  const p = currentUser.preferences || {
    interestWeight: 40,
    intentWeight: 20,
    lifestyleWeight: 20,
    ageWeight: 10,
    profileWeight: 10
  };

  let score = 0;

  // 1. Interests (Ratio of common interests to current user's interests)
  const common = (user.interests || []).filter(i =>
    (currentUser.interests || []).includes(i)
  );
  const interestBase = (currentUser.interests || []).length || 1;
  score += (common.length / interestBase) * p.interestWeight;

  // 2. Intent
  if (user.lookingFor === currentUser.lookingFor) {
    score += p.intentWeight;
  }

  // 3. Lifestyle (Personality)
  if (user.lifestyle?.personality === currentUser.lifestyle?.personality) {
    score += p.lifestyleWeight;
  }

  // 4. Age
  const age1 = getAge(user.dob);
  const age2 = getAge(currentUser.dob);
  if (age1 && age2) {
    const ageDiff = Math.abs(age1 - age2);
    score += Math.max(0, p.ageWeight - (ageDiff * 0.5)); // Age diff penalty
  }

  // 5. Profile Completed
  if (user.profileComplete) {
    score += p.profileWeight;
  }

  // Double check score doesn't exceed 100
  return Math.min(99, Math.max(10, Math.round(score)));
}

/**
 * Returns full breakdown of compatibility scores for analytics.
 */
export function calculateCompatibilityBreakdown(currentUser, user) {
  const p = currentUser.preferences || {
    interestWeight: 40,
    intentWeight: 20,
    lifestyleWeight: 20,
    ageWeight: 10,
    profileWeight: 10
  };

  const common = (user.interests || []).filter(i =>
    (currentUser.interests || []).includes(i)
  );
  const interestBase = (currentUser.interests || []).length || 1;
  const interestScoreRaw = (common.length / interestBase);

  const intentMatch = user.lookingFor === currentUser.lookingFor;
  const personalityMatch = user.lifestyle?.personality === currentUser.lifestyle?.personality;
  
  const age1 = getAge(user.dob);
  const age2 = getAge(currentUser.dob);
  const ageDiff = age1 && age2 ? Math.abs(age1 - age2) : 5;
  const ageScoreRaw = Math.max(0, 1 - (ageDiff / 20));

  const breakdown = {
    interests: Math.round(interestScoreRaw * 100),
    lifestyle: personalityMatch ? 100 : 0,
    intent: intentMatch ? 100 : 0,
    age: Math.round(ageScoreRaw * 100),
    profile: user.profileComplete ? 100 : 0
  };

  const totalScore = calculateCompatibility(user, currentUser);

  return { totalScore, breakdown };
}

export function calculateProfileScore(user) {
  let score = 0;
  const hasBasic = user.name && user.dob && user.gender && user.location?.city;
  if (hasBasic) score += 20;
  if (user.photos?.length >= 3) score += 20;
  if (user.interests?.length >= 3) score += 20;
  const validPrompts = (user.prompts || []).filter(p => p?.answer && p.answer.trim().length >= 10);
  if (validPrompts.length >= 2) score += 20;
  const life = user.lifestyle || {};
  if (life.smoking && life.drinking && life.personality) score += 20;
  return score;
}

export function generateConversationStarters(user1, user2) {
  const starters = [];
  const shared = (user1.interests || []).filter(i => (user2.interests || []).includes(i));
  if (shared.length >= 2) starters.push(`You both love ${shared[0]} and ${shared[1]}! What got you into them?`);
  else if (shared.length === 1) starters.push(`You both love ${shared[0]}! What got you into it?`);
  if (user2.prompts?.[0]?.answer) starters.push(`"${user2.prompts[0].answer}" — tell me more about that!`);
  if (user1.lifestyle?.personality === user2.lifestyle?.personality && user1.lifestyle?.personality)
    starters.push(`You're both ${user1.lifestyle.personality}s! How does that affect your daily life?`);
  starters.push("What's the best thing that happened to you this week?");
  return starters.slice(0, 3);
}

/**
 * ML-based Compatibility Score Prediction
 * Calls the Python ML API on port 5001.
 */
export async function calculateCompatibilityML(user, currentUser) {
  try {
    const common = (user.interests || []).filter(i => (currentUser.interests || []).includes(i));
    const interestBase = Math.max((currentUser.interests || []).length, 1);
    const interestMatch = common.length / interestBase;
    
    const age1 = getAge(user.dob);
    const age2 = getAge(currentUser.dob);
    const ageDiff = age1 && age2 ? Math.abs(age1 - age2) : 5;
    
    const sameIntent = user.lookingFor === currentUser.lookingFor ? 1 : 0;
    const lifestyleMatch = user.lifestyle?.personality === currentUser.lifestyle?.personality ? 1 : 0;
    
    let distance = 50; 
    if (user.location?.coordinates && currentUser.location?.coordinates) {
       const [lon1, lat1] = user.location.coordinates;
       const [lon2, lat2] = currentUser.location.coordinates;
       const R = 6371; 
       const dLat = (lat2 - lat1) * Math.PI / 180;
       const dLon = (lon2 - lon1) * Math.PI / 180;
       const a = 
         Math.sin(dLat/2) * Math.sin(dLat/2) +
         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
         Math.sin(dLon/2) * Math.sin(dLon/2);
       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
       distance = R * c;
    }

    const response = await fetch("http://localhost:5001/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interestMatch,
        ageDiff,
        sameIntent,
        lifestyleMatch,
        distance
      })
    });
    
    if (!response.ok) throw new Error("ML API returned " + response.status);
    const data = await response.json();
    return data.compatibility || Math.round(calculateCompatibility(user, currentUser));
  } catch (error) {
    console.error(`[ML Error for user ${user.name}]:`, error.message);
    return Math.round(calculateCompatibility(user, currentUser));
  }
}

