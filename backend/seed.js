require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const Agent = require('./models/Agent');

const seedDB = async () => {
    try {
        await connectDB();
        
        // Check if seeded
        const adminCount = await Admin.countDocuments();
        if (adminCount > 0) {
            console.log('Database already seeded. Run "npm run seed --force" or delete database to force re-seed.');
            process.exit(0);
        }

        console.log('Seeding Database...');

        const password_hash = await bcrypt.hash('admin123', 10);
        const agent_hash = await bcrypt.hash('test123', 10);

        // Create Admin
        await Admin.create({
            email: 'admin@ewaste.com',
            password_hash,
            full_name: 'Super Admin'
        });

        // Create Agent
        await Agent.create({
            email: 'agent@ngo.org',
            password_hash: agent_hash,
            full_name: 'John Agent',
            ngo_id: 'NGO-001'
        });

        console.log('✅ Demo accounts seeded successfully!');
        console.log('-> Admin: admin@ewaste.com / admin123');
        console.log('-> Agent: agent@ngo.org / test123');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seedDB();
