/**
 * Spark Dating App — Automated Backend Test Suite
 * Run: node backend/test/runTests.js
 *
 * Tests the full user journey:
 * signup → login → feed → like → mutual match → fetch matches → chat
 */

import fetch from 'node-fetch';

const BASE = 'http://localhost:5000/api';
const PASS = 'TestPass123!';

let passed = 0;
let failed = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(label, ok, detail = '') {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
  ok ? passed++ : failed++;
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(label, condition, detail) {
  log(label, condition, detail);
  if (!condition) throw new Error(`FAIL: ${label}`);
}

// ── Test runner ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🧪 Spark Dating App — Test Suite\n' + '─'.repeat(50));

  // ── 1. Health check ──────────────────────────────────────────────────────
  console.log('\n📡 1. Health Check');
  const health = await req('GET', '/health');
  assert('Server is running', health.status === 200, `status=${health.status}`);
  assert('Health returns ok', health.data.status === 'ok');

  // ── 2. User A — Register ─────────────────────────────────────────────────
  console.log('\n👤 2. User Registration');
  const emailA = `testa_${Date.now()}@spark.test`;
  const regA = await req('POST', '/auth/register', { name: 'Test Alice', email: emailA, password: PASS });
  assert('User A registered', regA.status === 201, `status=${regA.status}`);
  assert('User A has token', !!regA.data.token);
  assert('User A has _id', !!regA.data.user?._id);
  const tokenA = regA.data.token;
  const userAId = regA.data.user._id;

  // ── 3. User B — Register ─────────────────────────────────────────────────
  const emailB = `testb_${Date.now()}@spark.test`;
  const regB = await req('POST', '/auth/register', { name: 'Test Bob', email: emailB, password: PASS });
  assert('User B registered', regB.status === 201);
  const tokenB = regB.data.token;
  const userBId = regB.data.user._id;

  // ── 4. Login ─────────────────────────────────────────────────────────────
  console.log('\n🔐 3. Login');
  const loginA = await req('POST', '/auth/login', { email: emailA, password: PASS });
  assert('User A login succeeds', loginA.status === 200, `status=${loginA.status}`);
  assert('Login returns token', !!loginA.data.token);
  assert('Login returns full user', !!loginA.data.user?.email);

  // ── 5. Session restore (GET /me) ─────────────────────────────────────────
  console.log('\n🔄 4. Session Restore');
  const me = await req('GET', '/auth/me', null, tokenA);
  assert('GET /me returns user', me.status === 200);
  assert('GET /me has correct email', me.data.email === emailA);

  // ── 6. Complete onboarding for both users ────────────────────────────────
  console.log('\n📝 5. Onboarding');
  const onboardA = await req('POST', '/user/onboarding', {
    gender: 'female', interestedIn: ['male'],
    dob: '1995-06-15',
    lookingFor: 'serious',
    interests: ['Travel', 'Music', 'Fitness'],
    lifestyle: { schedule: 'morning', personality: 'extrovert', smoking: 'never', drinking: 'sometimes', workout: 'often' },
    location: { city: 'Los Angeles', country: 'USA' },
    prompts: [{ question: "I'm known for...", answer: "My love of adventure!" }],
    onboardingStep: 9, profileComplete: true
  }, tokenA);
  assert('User A onboarding saved', onboardA.status === 200, `status=${onboardA.status}`);
  assert('User A profileComplete', onboardA.data.user?.profileComplete === true);

  const onboardB = await req('POST', '/user/onboarding', {
    gender: 'male', interestedIn: ['female'],
    dob: '1993-03-20',
    lookingFor: 'serious',
    interests: ['Travel', 'Tech', 'Fitness'],
    lifestyle: { schedule: 'morning', personality: 'extrovert', smoking: 'never', drinking: 'sometimes', workout: 'often' },
    location: { city: 'Los Angeles', country: 'USA' },
    prompts: [{ question: "Perfect weekend...", answer: "Hiking and good food!" }],
    onboardingStep: 9, profileComplete: true
  }, tokenB);
  assert('User B onboarding saved', onboardB.status === 200);

  // ── 7. Feed ──────────────────────────────────────────────────────────────
  console.log('\n📡 6. Feed');
  const feedA = await req('GET', '/matches/feed', null, tokenA);
  assert('Feed returns 200', feedA.status === 200, `status=${feedA.status}`);
  assert('Feed has users', Array.isArray(feedA.data) && feedA.data.length > 0, `count=${feedA.data?.length}`);
  assert('Feed excludes self', !feedA.data.some(u => u._id === userAId));
  assert('Feed has compatibilityScore', feedA.data[0]?.compatibilityScore >= 0);
  console.log(`   Feed returned ${feedA.data.length} users, top score: ${feedA.data[0]?.compatibilityScore}%`);

  // ── 8. Like (one-way — no match yet) ────────────────────────────────────
  console.log('\n❤️  7. Like System');
  const likeAB = await req('POST', `/matches/like/${userBId}`, null, tokenA);
  assert('User A likes User B — 200', likeAB.status === 200, `status=${likeAB.status}`);
  assert('One-way like is NOT a match', likeAB.data.matched === false, `matched=${likeAB.data.matched}`);

  // Verify like saved in DB
  const likesA = await req('GET', '/matches/likes', null, tokenA);
  assert('Like saved in DB', likesA.data.some(u => u._id === userBId), `likes=${JSON.stringify(likesA.data.map(u => u._id))}`);

  // ── 9. Mutual like → Match ───────────────────────────────────────────────
  console.log('\n💘 8. Match Detection');
  const likeBA = await req('POST', `/matches/like/${userAId}`, null, tokenB);
  assert('User B likes User A — 200', likeBA.status === 200);
  assert('Mutual like creates match', likeBA.data.matched === true, `matched=${likeBA.data.matched}`);
  assert('Match has _id', !!likeBA.data.match?._id);
  assert('Match has compatibilityScore', likeBA.data.match?.compatibilityScore >= 0);
  const matchId = likeBA.data.match._id;
  console.log(`   Match created: ${matchId}, score: ${likeBA.data.match.compatibilityScore}%`);

  // ── 10. Fetch matches ────────────────────────────────────────────────────
  console.log('\n📋 9. Fetch Matches');
  const matchesA = await req('GET', '/matches', null, tokenA);
  assert('Matches endpoint returns 200', matchesA.status === 200);
  assert('Match visible for User A', matchesA.data.some(m => m._id === matchId), `matches=${matchesA.data.map(m => m._id)}`);

  const matchesB = await req('GET', '/matches', null, tokenB);
  assert('Match visible for User B', matchesB.data.some(m => m._id === matchId));

  // ── 11. Notifications ────────────────────────────────────────────────────
  console.log('\n🔔 10. Notifications');
  const notifsA = await req('GET', '/notifications', null, tokenA);
  assert('User A has notifications', notifsA.status === 200);
  assert('User A has match notification', notifsA.data.some(n => n.type === 'match'), `types=${notifsA.data.map(n => n.type)}`);

  const notifsB = await req('GET', '/notifications', null, tokenB);
  assert('User B has like notification', notifsB.data.some(n => n.type === 'like'));
  assert('User B has match notification', notifsB.data.some(n => n.type === 'match'));

  // ── 12. Chat ─────────────────────────────────────────────────────────────
  console.log('\n💬 11. Chat');
  const chat = await req('GET', `/chat/${matchId}`, null, tokenA);
  assert('Chat created for match', chat.status === 200, `status=${chat.status}`);
  assert('Chat has participants', chat.data.participants?.length === 2);

  const msgRes = await req('POST', `/chat/${matchId}/message`, { content: 'Hello from test!', type: 'text' }, tokenA);
  assert('Message sent via REST', msgRes.status === 200, `status=${msgRes.status}`);
  assert('Message has content', msgRes.data.content === 'Hello from test!');

  // Verify message persisted
  const chatAfter = await req('GET', `/chat/${matchId}`, null, tokenA);
  assert('Message persisted in DB', chatAfter.data.messages?.some(m => m.content === 'Hello from test!'));

  // ── 13. Superlike ────────────────────────────────────────────────────────
  console.log('\n⭐ 12. Superlike');
  const emailC = `testc_${Date.now()}@spark.test`;
  const regC = await req('POST', '/auth/register', { name: 'Test Carol', email: emailC, password: PASS });
  const tokenC = regC.data.token;
  const userCId = regC.data.user._id;

  const slAC = await req('POST', `/matches/superlike/${userCId}`, null, tokenA);
  assert('Superlike returns 200', slAC.status === 200);
  assert('Superlike isSuperLike=true', slAC.data.isSuperLike === true);
  assert('Superlike alone is not a match', slAC.data.matched === false);

  // ── 14. Remove match ─────────────────────────────────────────────────────
  console.log('\n🗑️  13. Remove Match');
  const removeRes = await req('DELETE', `/matches/${matchId}`, null, tokenA);
  assert('Remove match returns 200', removeRes.status === 200, `status=${removeRes.status}`);
  assert('Remove match success=true', removeRes.data.success === true);

  // Verify match no longer active
  const matchesAfterRemove = await req('GET', '/matches', null, tokenA);
  assert('Match no longer in list', !matchesAfterRemove.data.some(m => m._id === matchId));

  // ── 15. Compatibility stability ──────────────────────────────────────────
  console.log('\n📊 14. Compatibility Stability');
  const feedA2 = await req('GET', '/matches/feed', null, tokenA);
  if (feedA2.data.length > 0) {
    const score1 = feedA2.data[0].compatibilityScore;
    const feedA3 = await req('GET', '/matches/feed', null, tokenA);
    const score2 = feedA3.data[0].compatibilityScore;
    assert('Compatibility score is stable', score1 === score2, `${score1} vs ${score2}`);
    assert('Score is between 10-99', score1 >= 10 && score1 <= 99, `score=${score1}`);
  }

  // ── 16. Pass (skip) ──────────────────────────────────────────────────────
  console.log('\n⏭️  15. Pass/Skip');
  const feedForPass = await req('GET', '/matches/feed', null, tokenC);
  if (feedForPass.data.length > 0) {
    const passTarget = feedForPass.data[0]._id;
    const passRes = await req('POST', `/matches/pass/${passTarget}`, null, tokenC);
    assert('Pass returns 200', passRes.status === 200);
    // Verify passed user excluded from next feed
    const feedAfterPass = await req('GET', '/matches/feed', null, tokenC);
    assert('Passed user excluded from feed', !feedAfterPass.data.some(u => u._id === passTarget));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED — System is fully functional!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — check logs above\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n💥 Test runner crashed:', err.message);
  process.exit(1);
});
