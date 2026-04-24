import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const seedUsers = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // Automatically use memory server if we detect placeholder URI during seeding
    if (mongoUri && mongoUri.includes('<username>')) {
        console.log('Detected placeholder URI in seeder. Starting memory DB...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
    }

    console.log(`Connecting to DB: ${mongoUri.includes('127.0.0.1') ? 'Memory DB' : 'External DB'}...`);
    await mongoose.connect(mongoUri);
    console.log('DB Connected for seeding');
    
    await User.deleteMany({});
    console.log('Cleared existing users');
    
    const users = [];
    const interestsList = ['Music', 'Travel', 'Fitness', 'Cooking', 'Art', 'Gaming', 'Reading', 'Movies', 'Hiking', 'Photography'];
    
    for(let i=0; i<50; i++) {
        // Hash password manually since insertMany bypasses pre-save middleware
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('Password123!', salt);
        
        // Pick 3 random interests
        const shuffled = interestsList.sort(() => 0.5 - Math.random());
        const selectedInterests = shuffled.slice(0, 3);

        const gender = i % 2 === 0 ? 'male' : 'female';
        const imgNum = i % 10;

        users.push({
            name: `Test User ${i}`,
            email: `user${i}@example.com`,
            password: hashedPassword,
            gender: gender,
            dob: new Date(1990 + Math.floor(Math.random()*10), Math.floor(Math.random()*12), Math.floor(Math.random()*28) + 1),
            location: {
               type: 'Point',
               coordinates: [ -118.2437 + (Math.random()*0.5 - 0.25), 34.0522 + (Math.random()*0.5 - 0.25) ], // Randomish LA coordinates
               city: 'Los Angeles',
               country: 'USA'
            },
            profileComplete: true,
            onboardingStep: 9,
            interestedIn: [ gender === 'male' ? 'female' : 'male' ],
            photos: [`https://source.unsplash.com/random/400x400?portrait&sig=${i}`],
            lookingFor: i % 3 === 0 ? 'serious' : 'casual',
            interests: selectedInterests,
            lifestyle: {
              schedule: i % 2 === 0 ? 'morning' : 'night',
              personality: i % 3 === 0 ? 'introvert' : 'extrovert',
              smoking: 'never',
              drinking: 'sometimes',
              workout: 'often'
            },
            prompts: [
              { question: "I'm known for...", answer: "My sense of humor and love for adventure." },
              { question: "Perfect weekend...", answer: "Hiking in the morning and a cozy movie night." }
            ],
            profileScore: 80
        });
    }
    
    await User.insertMany(users);
    console.log('Successfully seeded 50 users!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedUsers();
