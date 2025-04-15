import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

// Interface for wallet data
interface WalletData {
  publicKey: string;
  privateKey: string;
}

// Generate a new Solana keypair
const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toString();
const privateKey = Buffer.from(keypair.secretKey).toString('base64');

console.log(`Generated new test recipient wallet:`);
console.log(`Public Key (address): ${publicKey}`);
console.log(`Private Key (base64): ${privateKey}\n`);

// Save wallet data to file
const walletData: WalletData = {
  publicKey,
  privateKey
};

fs.writeFileSync(
  'recipient-wallet.json',
  JSON.stringify(walletData, null, 2)
);

console.log(`Wallet data saved to recipient-wallet.json\n`);

// Show test commands
console.log(`To check if this wallet is eligible for an airdrop:`);
console.log(`curl http://localhost:10000/airdrop/check/${publicKey}\n`);

console.log(`To airdrop tokens to this wallet:`);
console.log(`curl -X POST http://localhost:10000/airdrop -H "Content-Type: application/json" -d '{"pubkey":"${publicKey}"}'\n`);

console.log(`To check the wallet's balance on Solana Explorer:`);
console.log(`https://explorer.solana.com/address/${publicKey}?cluster=devnet`); 