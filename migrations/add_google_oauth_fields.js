require('dotenv').config();
const { pool } = require('../config/database');

async function addGoogleOAuthFields() {
    try {
        console.log('Adding Google OAuth fields to users table...');
        
        // Check if columns already exist
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('google_id', 'auth_provider', 'profile_picture')
        `);
        
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        // Add google_id column if it doesn't exist
        if (!existingColumns.includes('google_id')) {
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN google_id VARCHAR(255) UNIQUE
            `);
            console.log('✓ Added google_id column');
        } else {
            console.log('✓ google_id column already exists');
        }
        
        // Add auth_provider column if it doesn't exist
        if (!existingColumns.includes('auth_provider')) {
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN auth_provider ENUM('local', 'google') DEFAULT 'local'
            `);
            console.log('✓ Added auth_provider column');
        } else {
            console.log('✓ auth_provider column already exists');
        }
        
        // Add profile_picture column if it doesn't exist
        if (!existingColumns.includes('profile_picture')) {
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN profile_picture TEXT
            `);
            console.log('✓ Added profile_picture column');
        } else {
            console.log('✓ profile_picture column already exists');
        }
        
        // Check if index exists
        const [indexes] = await pool.execute(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND INDEX_NAME = 'idx_google_id'
        `);
        
        if (indexes.length === 0) {
            // Create index on google_id for faster lookups
            await pool.execute(`
                CREATE INDEX idx_google_id ON users(google_id)
            `);
            console.log('✓ Created index on google_id');
        } else {
            console.log('✓ Index on google_id already exists');
        }
        
        // Update existing users to have auth_provider = 'local'
        await pool.execute(`
            UPDATE users 
            SET auth_provider = 'local' 
            WHERE auth_provider IS NULL
        `);
        
        console.log('✓ Updated existing users with auth_provider = local');
        
        console.log('✅ Google OAuth fields migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
addGoogleOAuthFields();