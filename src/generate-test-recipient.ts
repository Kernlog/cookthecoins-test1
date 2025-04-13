import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Define interface for our JSON data
interface TestTokens {
  walletAddress: string;
  tokenMints: string[];
}

interface WalletData {
  publicKey: string;
  privateKey: string;
}

// Generate a new random keypair for the recipient
const recipientKeypair = Keypair.generate();

// Get the public key (address)
const publicKey = recipientKeypair.publicKey.toString();

// Get the private key and encode it as base64
const privateKey = Buffer.from(recipientKeypair.secretKey).toString('base64');

// Console output
console.log('Generated test recipient wallet:');
console.log('Public Key (address):', publicKey);
console.log('Private Key (base64):', privateKey);

// Save to recipient-wallet.json
const walletData: WalletData = {
  publicKey,
  privateKey
};

fs.writeFileSync('recipient-wallet.json', JSON.stringify(walletData, null, 2));
console.log('\nRecipient wallet saved to recipient-wallet.json');

// Read the test tokens
try {
  const testTokensFile = fs.readFileSync('test-tokens.json', 'utf-8');
  const testTokens = JSON.parse(testTokensFile) as TestTokens;
  
  console.log('\nTest command to airdrop tokens to this recipient:');
  console.log(`curl -X POST http://localhost:3000/airdrop \\
  -H "Content-Type: application/json" \\
  -d '{"pubkey":"${publicKey}","pubkeys":${JSON.stringify(testTokens.tokenMints)}}'`);
} catch (err) {
  const error = err as Error;
  console.log('\nNo test tokens found. Run setup-test-tokens.ts first.');
} 