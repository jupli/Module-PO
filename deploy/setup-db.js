const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Database Setup...');

try {
  // 0. Generate Prisma Client (Ensure it matches the OS)
  console.log('\n🔄 Generating Prisma Client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
  } catch (err) {
    console.log('Retrying with local node_modules binary...');
    const prismaBin = path.join('node_modules', '.bin', 'prisma');
    execSync(`${prismaBin} generate`, { stdio: 'inherit' });
  }
  console.log('✅ Prisma Client generated.');

  // 1. Run Migrations (Create Tables)
  console.log('\n📦 Running migrations (Creating Tables)...');
  // Use local prisma binary if possible, otherwise rely on npx
  // In cPanel node modules, .bin/prisma should be available after install
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } catch (err) {
    console.log('Retrying with local node_modules binary...');
    const prismaBin = path.join('node_modules', '.bin', 'prisma');
    execSync(`${prismaBin} migrate deploy`, { stdio: 'inherit' });
  }
  console.log('✅ Tables created successfully.');

  // 2. Run Seeder (Create Admin User)
  console.log('\n👤 Seeding admin user...');
  execSync('node seed-user.js', { stdio: 'inherit' });
  console.log('✅ Admin user ready.');

  console.log('\n🎉 Database setup complete! You can now start the application.');

} catch (error) {
  console.error('\n❌ Error during setup:', error.message);
  process.exit(1);
}
