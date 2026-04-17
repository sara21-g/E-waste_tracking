// backend/create-agent-hash.js
const bcrypt = require('bcryptjs');

async function createHash() {
    const password = 'test123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('\n========================================');
    console.log('🔐 PASSWORD HASH GENERATED');
    console.log('========================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('========================================');
    console.log('\n📋 SQL to update your database:');
    console.log(`UPDATE agents SET password_hash = '${hash}' WHERE email = 'agent@ngo.org';`);
    console.log(`UPDATE agents SET password_hash = '${hash}' WHERE email = 'maria@greenrecycle.org';`);
    console.log(`UPDATE agents SET password_hash = '${hash}' WHERE email = 'alex@ewaste.org';`);
    console.log('========================================\n');
}

createHash();