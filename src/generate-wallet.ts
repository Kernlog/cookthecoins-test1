import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Define interface for wallet data
interface WalletData {
  publicKey: string;
  privateKey: string;
}

// Generate a new random keypair
const keypair = Keypair.generate();

// Get the public key (address)
const publicKey = keypair.publicKey.toString();

// Get the private key and encode it as base64
const privateKey = Buffer.from(keypair.secretKey).toString('base64');

// Console output
console.log('Generated new Solana wallet:');
console.log('Public Key (address):', publicKey);
console.log('Private Key (base64):', privateKey);
console.log('\nIMPORTANT: Save this private key securely! It will only be shown once.');
console.log('Add this private key to your .env file as AIRDROP_WALLET_PRIVATE_KEY.');

// Save to wallet.json (for development purposes only)
const walletData: WalletData = {
  publicKey,
  privateKey
};

fs.writeFileSync('wallet.json', JSON.stringify(walletData, null, 2));
console.log('\nWallet information saved to wallet.json');
console.log('WARNING: Delete this file after copying the keys to a secure location!'); 