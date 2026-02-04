const mongoose = require('mongoose');
const SharedCalendar = require('./models/SharedCalendar');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const calendars = await SharedCalendar.find({});
        console.log(`Found ${calendars.length} calendars`);

        for (const cal of calendars) {
            const newMembers = [];
            let needsUpdate = false;

            console.log(`Processing calendar: ${cal.name}, members:`, JSON.stringify(cal.members));

            for (const member of cal.members) {
                // If member is just an ID (not an object with 'user' property)
                if (member && typeof member === 'object' && member.user) {
                    // Already in correct format
                    newMembers.push(member);
                } else if (member) {
                    // It's a plain ObjectId, convert it
                    const memberId = member._id || member;
                    const isOwner = memberId.toString() === cal.ownerId.toString();
                    newMembers.push({
                        user: memberId,
                        role: isOwner ? 'edit' : 'view'
                    });
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await SharedCalendar.findByIdAndUpdate(cal._id, { members: newMembers });
                console.log(`Migrated calendar: ${cal.name}`);
            } else {
                console.log(`Calendar ${cal.name} already in correct format`);
            }
        }

        console.log('Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
