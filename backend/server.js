import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import filterRoutes from './routes/filter.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import { setupSocket } from './socket/socketHandler.js';
import { setIo } from './utils/ioInstance.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://dating-app-kappa-six.vercel.app',
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true }
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads')); // serve local upload fallback

// Routes
app.use('/api/auth', authRoutes);
// IMPORTANT: mount filter routes before /api/users/:id in userRoutes
// so /api/users/filter is not captured as an :id param.
app.use('/api/users', filterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.io
setupSocket(io);
setIo(io);

// ─── DEMO USER SEEDER ───────────────────────────────────────────────────────
async function seedDemoUsers(User, bcrypt) {
  const demoCount = await User.countDocuments({ isDemo: true });
  if (demoCount >= 180) {
    console.log(`✓ ${demoCount} demo users present.`);
    return;
  }

  console.log(`Seeding demo users (have ${demoCount}, want 200)...`);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);

  const allInterests = ['Music','Travel','Fitness','Cooking','Art','Gaming','Reading','Movies','Hiking','Photography','Dancing','Yoga','Coffee','Wine','Sports','Tech','Fashion','Pets','Surfing','Cycling','Meditation','Foodie','Concerts','Camping','Climbing'];
  const cities = [
    { city: 'Los Angeles', country: 'USA', coords: [-118.2437, 34.0522] },
    { city: 'New York', country: 'USA', coords: [-74.006, 40.7128] },
    { city: 'London', country: 'UK', coords: [-0.1276, 51.5074] },
    { city: 'Toronto', country: 'Canada', coords: [-79.3832, 43.6532] },
    { city: 'Sydney', country: 'Australia', coords: [151.2093, -33.8688] },
    { city: 'Paris', country: 'France', coords: [2.3522, 48.8566] },
    { city: 'Berlin', country: 'Germany', coords: [13.405, 52.52] },
    { city: 'Tokyo', country: 'Japan', coords: [139.6917, 35.6895] },
    { city: 'Miami', country: 'USA', coords: [-80.1918, 25.7617] },
    { city: 'Chicago', country: 'USA', coords: [-87.6298, 41.8781] },
  ];
  const schedules = ['morning','night'];
  const personalities = ['introvert','extrovert'];
  const smokingOpts = ['never','sometimes','often'];
  const drinkingOpts = ['never','sometimes','often'];
  const workoutOpts = ['never','sometimes','often'];
  const intents = ['serious','casual','friendship'];
  const bodyTypes = ['slim','athletic','average','curvy','plus-size'];

  // Curated profiles (first 12 with real Unsplash photos)
  const curated = [
    { name:'Aria',   gender:'female', dob:new Date(1996,3,12),  interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop'], jobTitle:'UX Designer',       lookingFor:'serious'  },
    { name:'Leo',    gender:'male',   dob:new Date(1994,7,5),   interestedIn:['female'], photos:['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop'], jobTitle:'Software Engineer', lookingFor:'serious'  },
    { name:'Maya',   gender:'female', dob:new Date(1997,11,20), interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop'], jobTitle:'Graphic Artist',    lookingFor:'casual'   },
    { name:'Zane',   gender:'male',   dob:new Date(1993,5,8),   interestedIn:['female'], photos:['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop'], jobTitle:'Personal Trainer',  lookingFor:'serious'  },
    { name:'Elena',  gender:'female', dob:new Date(1995,9,15),  interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop'], jobTitle:'Musician',          lookingFor:'serious'  },
    { name:'Kael',   gender:'male',   dob:new Date(1992,1,28),  interestedIn:['female'], photos:['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop'], jobTitle:'Photographer',      lookingFor:'casual'   },
    { name:'Sofia',  gender:'female', dob:new Date(1998,6,3),   interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop'], jobTitle:'Marketing Manager', lookingFor:'serious'  },
    { name:'Ethan',  gender:'male',   dob:new Date(1991,3,17),  interestedIn:['female'], photos:['https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop'], jobTitle:'Architect',         lookingFor:'serious'  },
    { name:'Chloe',  gender:'female', dob:new Date(1999,8,22),  interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop'], jobTitle:'Nurse',             lookingFor:'friendship'},
    { name:'Marcus', gender:'male',   dob:new Date(1990,11,5),  interestedIn:['female'], photos:['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop'], jobTitle:'Chef',              lookingFor:'casual'   },
    { name:'Priya',  gender:'female', dob:new Date(1996,2,14),  interestedIn:['male'],   photos:['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop'], jobTitle:'Data Scientist',    lookingFor:'serious'  },
    { name:'Jake',   gender:'male',   dob:new Date(1995,7,30),  interestedIn:['female'], photos:['https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=600&fit=crop'], jobTitle:'Startup Founder',   lookingFor:'serious'  },
  ];

  // Generate remaining random profiles
  const maleNames   = ['Alex','Ryan','Noah','Liam','Owen','Cole','Finn','Jace','Beau','Reid','Troy','Dean','Seth','Wade','Kurt','Blake','Chase','Drew','Evan','Grant','Hayes','Ivan','Joel','Kyle','Lance','Miles','Nate','Omar','Paul','Quinn','Ross','Sean','Tate','Umar','Vince','Will','Xander','Yusuf','Zach','Aaron','Ben','Carlos','Derek','Eric','Felix','George','Henry','Ian','James'];
  const femaleNames = ['Emma','Lily','Zoe','Ava','Mia','Nora','Luna','Jade','Rose','Ivy','Skye','Faye','Tess','Wren','Bree','Cara','Dana','Elle','Fiona','Grace','Hana','Iris','Jess','Kira','Leah','Mara','Nina','Opal','Pam','Quinn','Rita','Sara','Tara','Uma','Vera','Wendy','Xena','Yara','Zara','Abby','Beth','Clara','Diana','Eva','Faith','Gina','Holly','Isla','Julia'];
  const malePhotos = [
    'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1524593166156-312f362cada0?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&h=600&fit=crop',
  ];
  const femalePhotos = [
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
  ];
  const jobTitles = ['Teacher','Lawyer','Doctor','Artist','Writer','Engineer','Designer','Nurse','Chef','Pilot','Accountant','Therapist','Consultant','Developer','Manager','Photographer','Architect','Musician','Scientist','Entrepreneur'];
  const promptPairs = [
    ["I'm known for...", "My sense of humor and love for adventure."],
    ["Perfect weekend...", "Hiking in the morning and a cozy movie night."],
    ["I'm looking for...", "Someone who makes me laugh and challenges me to grow."],
    ["My love language is...", "Quality time and spontaneous adventures."],
    ["Unpopular opinion...", "Pineapple on pizza is actually great."],
    ["I geek out on...", "True crime podcasts and obscure history facts."],
    ["Best travel story...", "Got lost in Tokyo and found the best ramen spot ever."],
  ];

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randInterests = () => [...allInterests].sort(() => 0.5 - Math.random()).slice(0, randInt(3, 6));
  const randPrompts = () => [...promptPairs].sort(() => 0.5 - Math.random()).slice(0, 2).map(([question, answer]) => ({ question, answer }));

  // Build curated entries (skip already-seeded names)
  const existingNames = new Set((await User.find({ isDemo: true }).select('name').lean()).map(u => u.name));
  const curatedEntries = curated
    .filter(p => !existingNames.has(p.name))
    .map((p, idx) => {
      const loc = cities[idx % cities.length];
      return {
        ...p,
        email: `${p.name.toLowerCase()}.demo.${Date.now() + idx}@spark.app`,
        password: hashedPassword,
        isDemo: true, profileComplete: true, onboardingStep: 9, profileScore: randInt(70, 95),
        interests: randInterests(),
        lifestyle: { schedule: rand(schedules), personality: rand(personalities), smoking: rand(smokingOpts), drinking: rand(drinkingOpts), workout: rand(workoutOpts) },
        bodyType: rand(bodyTypes),
        height: randInt(155, 195),
        education: "Bachelor's Degree",
        location: { type:'Point', coordinates:[loc.coords[0]+(Math.random()*0.2-0.1), loc.coords[1]+(Math.random()*0.2-0.1)], city:loc.city, country:loc.country },
        prompts: randPrompts()
      };
    });

  // Generate to reach 100 males + 100 females total
  const existingMales   = await User.countDocuments({ isDemo: true, gender: 'male' });
  const existingFemales = await User.countDocuments({ isDemo: true, gender: 'female' });
  const malesNeeded   = Math.max(0, 100 - existingMales   - curatedEntries.filter(u => u.gender === 'male').length);
  const femalesNeeded = Math.max(0, 100 - existingFemales - curatedEntries.filter(u => u.gender === 'female').length);

  const makeUser = (gender, idx) => {
    const isFemale = gender === 'female';
    const names = isFemale ? femaleNames : maleNames;
    const photos = isFemale ? femalePhotos : malePhotos;
    const loc = cities[idx % cities.length];
    return {
      name: names[idx % names.length],
      gender,
      dob: new Date(randInt(1990, 2004), randInt(0,11), randInt(1,28)),
      interestedIn: isFemale ? ['male'] : ['female'],
      lookingFor: rand(intents),
      photos: [photos[idx % photos.length]],
      jobTitle: rand(jobTitles),
      interests: randInterests(),
      lifestyle: { schedule:rand(schedules), personality:rand(personalities), smoking:rand(smokingOpts), drinking:rand(drinkingOpts), workout:rand(workoutOpts) },
      bodyType: rand(bodyTypes),
      height: randInt(isFemale ? 155 : 165, isFemale ? 180 : 195),
      education: "Bachelor's Degree",
      email: `${gender}${idx}.demo.${Date.now() + idx}@spark.app`,
      password: hashedPassword,
      isDemo: true, profileComplete: true, onboardingStep: 9, profileScore: randInt(60, 95),
      location: { type:'Point', coordinates:[loc.coords[0]+(Math.random()*0.4-0.2), loc.coords[1]+(Math.random()*0.4-0.2)], city:loc.city, country:loc.country },
      prompts: randPrompts()
    };
  };

  const maleEntries   = Array.from({ length: malesNeeded },   (_, i) => makeUser('male',   i));
  const femaleEntries = Array.from({ length: femalesNeeded }, (_, i) => makeUser('female', i));

  const toInsert = [...curatedEntries, ...maleEntries, ...femaleEntries];
  if (toInsert.length > 0) {
    await User.insertMany(toInsert, { ordered: false }).catch(() => {});
    console.log(`✓ Seeded ${toInsert.length} demo users (${malesNeeded} male, ${femalesNeeded} female).`);
  }

  // Stable test account
  const testerEmail = 'fixtest@example.com';
  const existingTester = await User.findOne({ email: testerEmail });
  if (!existingTester) {
    await User.create({
      name: 'Fix Tester', email: testerEmail, password: 'Password123!',
      isDemo: false, profileComplete: true, onboardingStep: 9,
      gender: 'female', dob: new Date(1995, 0, 1),
      location: { type:'Point', coordinates:[-118.2437, 34.0522], city:'Los Angeles', country:'USA' },
      interestedIn: ['male'],
      photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400'],
      interests: ['Travel','Music','Fitness'],
      lifestyle: { schedule:'morning', personality:'extrovert', smoking:'never', drinking:'sometimes', workout:'often' },
      profileScore: 90,
      prompts: [
        { question:"I'm known for...", answer:"Always finding the best coffee spots in every city!" },
        { question:"Perfect weekend...", answer:"Morning hike, afternoon at a museum, dinner with friends." }
      ]
    });
    console.log('✓ Test user fixtest@example.com created.');
  }

  // ── Simulate matches between demo users so Matches page is never empty ──
  await simulateDemoMatches(User);
}

async function simulateDemoMatches(User) {
  const Match = (await import('./models/Match.js')).default;
  const Chat  = (await import('./models/Chat.js')).default;
  const { calculateCompatibility } = await import('./utils/matchingEngine.js');

  const existingMatchCount = await Match.countDocuments();
  if (existingMatchCount >= 3) {
    console.log(`✓ ${existingMatchCount} matches already exist.`);
    return;
  }

  // Get the test user + a few demo users of opposite gender
  const tester = await User.findOne({ email: 'fixtest@example.com' }).lean();
  if (!tester) return;

  const demoMales = await User.find({ isDemo: true, gender: 'male' }).limit(5).lean();
  if (!demoMales.length) return;

  console.log(`Simulating ${demoMales.length} demo matches...`);

  for (const demo of demoMales) {
    try {
      // Mutual like
      await User.findByIdAndUpdate(tester._id, { $addToSet: { likes: demo._id } });
      await User.findByIdAndUpdate(demo._id,   { $addToSet: { likes: tester._id } });

      const score = calculateCompatibility(tester, demo);
      const [u1, u2] = [tester._id, demo._id].sort((a, b) => a.toString().localeCompare(b.toString()));

      const match = await Match.findOneAndUpdate(
        { user1: u1, user2: u2 },
        { user1: u1, user2: u2, compatibilityScore: score, active: true },
        { upsert: true, new: true }
      );
      await Chat.findOneAndUpdate(
        { matchId: match._id },
        { matchId: match._id, participants: [tester._id, demo._id] },
        { upsert: true }
      );
    } catch { /* skip duplicates */ }
  }
  console.log(`✓ Demo matches simulated.`);
}

// ─── DB + START ──────────────────────────────────────────────────────────────
const isPlaceholderURI = (uri) =>
  !uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<user>');

const startServer = async (uri) => {
  await mongoose.connect(uri);
  console.log('✓ MongoDB connected:', uri.startsWith('mongodb+srv') ? 'Atlas' : 'In-Memory');

  const User = (await import('./models/User.js')).default;
  const bcrypt = (await import('bcryptjs')).default;
  await seedDemoUsers(User, bcrypt);

  if (!httpServer.listening) {
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
  }
};

const connectDB = async () => {
  // Detect placeholder URI immediately — skip Atlas, go straight to in-memory
  if (isPlaceholderURI(process.env.MONGO_URI)) {
    console.log('⚙ No real MongoDB URI found → starting persistent local DB...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const path = await import('path');
      const fs = await import('fs');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dbPath = path.join(__dirname, '.mongo-data');

      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

      if (!global.__mongod__) {
        global.__mongod__ = await MongoMemoryServer.create({
          instance: {
            dbName: 'sparkapp',
            dbPath: dbPath,
            storageEngine: 'wiredTiger',
          }
        });
      }
      const memUri = global.__mongod__.getUri();
      console.log('✓ Local DB ready (data persists in .mongo-data/)');
      await startServer(memUri);
    } catch (err) {
      console.error('✗ Local DB failed:', err.message);
    }
    return;
  }

  // Real URI — try Atlas / local MongoDB
  try {
    console.log('🌐 Connecting to MongoDB...');
    await startServer(process.env.MONGO_URI);
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    console.log('⚙ Falling back to in-memory DB...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const path = await import('path');
      const fs = await import('fs');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dbPath = path.join(__dirname, '.mongo-data');
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
      if (!global.__mongod__) {
        global.__mongod__ = await MongoMemoryServer.create({
          instance: { dbName: 'sparkapp', dbPath: dbPath, storageEngine: 'wiredTiger' }
        });
      }
      const memUri = global.__mongod__.getUri();
      await startServer(memUri);
    } catch (memErr) {
      console.error('✗ In-memory DB also failed:', memErr.message);
      console.log('⏱ Retrying in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

connectDB();

export { io };
