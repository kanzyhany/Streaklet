const mongoose = require('mongoose');
require('dotenv').config();
const Habit = require('./models/Habit');
const Streak = require('./models/Streak');
const User = require('./models/User');
const SharedCalendar = require('./models/SharedCalendar');

const fixGymStreak = async () => {
    try {
        console.log('Connecting to database...');
        // Try to verify connection string
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/streaklet';
        console.log(`Using URI: ${mongoUri.replace(/:[^:]*@/, ':****@')}`); // masking credentials
        await mongoose.connect(mongoUri);

        console.log('Searching for "Gym" habit...');
        // Find habit with "gym" in title (case insensitive)
        const habits = await Habit.find({ title: /gym/i });

        if (habits.length === 0) {
            console.log('❌ No habits found with "gym" in the title.');
            process.exit(1);
        }

        if (habits.length > 1) {
            console.log(`⚠️ Found ${habits.length} habits with "gym" in title:`);
            habits.forEach(h => console.log(` - ID: ${h._id}, Title: "${h.title}"`));
            console.log('Please be more specific or manually update by ID.');
            process.exit(1);
        }

        const habit = habits[0];
        console.log(`✅ Found habit: "${habit.title}" (ID: ${habit._id})`);

        // Find or create streak
        let streak = await Streak.findOne({ habitId: habit._id });
        if (!streak) {
            console.log('Creating new streak record...');
            streak = await Streak.create({
                habitId: habit._id,
                userId: habit.userId,
                currentStreak: 0,
                longestStreak: 0,
                totalStreaksAchieved: 0
            });
        }

        console.log(`Current Streak: ${streak.currentStreak}`);
        console.log(`Goals: Set streak to 5, award points.`);

        // Update Streak
        streak.currentStreak = 5;
        // We set totalStreaksAchieved to 1 assuming 5 is the first milestone
        streak.totalStreaksAchieved = 1;
        await streak.save();
        console.log('✅ Streak updated to 5.');

        // Award Points
        if (habit.sharedCalendarId) {
            console.log('Shared Calendar Habit. Updating calendar points...');
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar) {
                const oldPoints = calendar.points;
                calendar.points += 2;
                console.log(`Points updated: ${oldPoints} -> ${calendar.points}`);

                // Overflow check (if points >= 10)
                if (calendar.points >= 10) {
                    const graceDays = Math.floor(calendar.points / 10);
                    calendar.members.forEach(m => m.graceDays += graceDays);
                    calendar.points = calendar.points % 10;
                    console.log(`🎉 Awarded ${graceDays} grace days to members!`);
                }
                await calendar.save();
            }
        } else {
            console.log('Personal Habit. Updating user points...');
            const user = await User.findById(habit.userId);
            if (user) {
                const oldPoints = user.personalPoints;
                const oldGrace = user.personalGraceDays;

                user.personalPoints += 5;
                console.log(`Points updated: ${oldPoints} -> ${user.personalPoints}`);

                if (user.personalPoints >= 10) {
                    const graceDays = Math.floor(user.personalPoints / 10);
                    user.personalGraceDays += graceDays;
                    user.personalPoints = user.personalPoints % 10;
                    console.log(`🎉 Awarded ${graceDays} grace day(s)! (Grace Days: ${oldGrace} -> ${user.personalGraceDays})`);
                }
                await user.save();
            }
        }

        console.log('SUCCESS! Fix applied.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixGymStreak();
