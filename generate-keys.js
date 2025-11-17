/**
 * Generate RSA Key Pair for EFT JWT Authentication
 * 
 * This script generates a private/public key pair for signing
 * JWT tokens used to authenticate with the EFT Service.
 * 
 * Usage: node generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating RSA Key Pair for EFT JWT...\n');

try {
  // Generate RSA key pair (2048 bits)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Save private key
  const privateKeyPath = path.join(__dirname, 'eft-jwt-private.pem');
  fs.writeFileSync(privateKeyPath, privateKey);
  console.log('✅ Private key saved to: eft-jwt-private.pem');

  // Save public key
  const publicKeyPath = path.join(__dirname, 'eft-jwt-public.pem');
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log('✅ Public key saved to: eft-jwt-public.pem');

  // Update .gitignore
  const gitignorePath = path.join(__dirname, '.gitignore');
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  if (!gitignoreContent.includes('*.pem')) {
    fs.appendFileSync(gitignorePath, '\n# JWT Keys\n*.pem\n');
    console.log('✅ Added *.pem to .gitignore');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Add this to your .env.local file:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('# EFT Service JWT Configuration');
  console.log('EFT_JWT_PRIVATE_KEY_PATH=./eft-jwt-private.pem');
  console.log('NEXT_PUBLIC_EFT_SERVICE_URL=http://localhost:8080/v1/eft');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 Security Notes:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. ⚠️  NEVER commit *.pem files to Git!');
  console.log('2. 📤 Share eft-jwt-public.pem with EFT Service');
  console.log('3. 🔐 Keep eft-jwt-private.pem secure and private');
  console.log('4. 🔄 For production, use environment variables instead of file path');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. Copy the lines above to your .env.local file');
  console.log('2. Restart your dev server: npm run dev');
  console.log('3. Test payment link - should work now! ✅\n');

  // Optional: Display private key for environment variable
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 For Production (Environment Variable):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const privateKeyEscaped = privateKey.replace(/\n/g, '\\n');
  console.log('EFT_JWT_PRIVATE_KEY="' + privateKeyEscaped + '"');
  
  console.log('\n✅ Keys generated successfully!\n');

} catch (error) {
  console.error('❌ Error generating keys:', error.message);
  process.exit(1);
}
