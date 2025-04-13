import { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo 
} from '@solana/spl-token';
import fs from 'fs';
import dotenv from 'dotenv';

// Define interface for our JSON data
interface WalletData {
  publicKey: string;
  privateKey: string;
}

interface TestTokens {
  walletAddress: string;
  tokenMints: string[];
}

// Load environment variables
dotenv.config();

// Read the wallet data
const walletFile = fs.readFileSync('wallet.json', 'utf-8');
const walletData = JSON.parse(walletFile) as WalletData;
const walletPublicKey = new PublicKey(walletData.publicKey);
const walletPrivateKey = Buffer.from(walletData.privateKey, 'base64');
const walletKeypair = Keypair.fromSecretKey(walletPrivateKey);

// Create connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function main() {
  try {
    console.log('Setting up test tokens for Solana airdrop service...');
    console.log('Wallet address:', walletData.publicKey);

    // Step 1: Request SOL from devnet faucet
    console.log('\nStep 1: Requesting 2 SOL from devnet faucet...');
    const airdropSignature = await connection.requestAirdrop(walletPublicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature);
    
    // Check balance
    const balance = await connection.getBalance(walletPublicKey);
    console.log(`SOL balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Step 2: Create test tokens (mints)
    console.log('\nStep 2: Creating test tokens...');
    const tokenMints: string[] = [];
    
    // Create 3 test tokens
    for (let i = 0; i < 3; i++) {
      console.log(`Creating test token #${i+1}...`);
      
      // Create new mint
      const mint = await createMint(
        connection,
        walletKeypair,
        walletPublicKey,
        walletPublicKey,
        9 // 9 decimals
      );
      
      console.log(`Token mint created: ${mint.toString()}`);
      
      // Create token account for the wallet
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeypair,
        mint,
        walletPublicKey
      );
      
      console.log(`Token account created: ${tokenAccount.address.toString()}`);
      
      // Mint 100,000 tokens to the wallet
      await mintTo(
        connection,
        walletKeypair,
        mint,
        tokenAccount.address,
        walletKeypair,
        100000 * (10 ** 9) // 100,000 tokens with 9 decimals
      );
      
      console.log(`Minted 100,000 tokens to the wallet`);
      
      tokenMints.push(mint.toString());
    }
    
    // Save the token mints to a file
    const testTokensData: TestTokens = {
      walletAddress: walletPublicKey.toString(),
      tokenMints
    };
    
    fs.writeFileSync('test-tokens.json', JSON.stringify(testTokensData, null, 2));
    
    console.log('\nTest setup complete!');
    console.log('Token mints saved to test-tokens.json');
    console.log('\nYou can now test your airdrop service with:');
    console.log(`curl -X POST http://localhost:3000/airdrop \\
  -H "Content-Type: application/json" \\
  -d '{"pubkey":"<RECIPIENT_PUBKEY>","pubkeys":${JSON.stringify(tokenMints)}}'`);
    
  } catch (err) {
    const error = err as Error;
    console.error('Error setting up test tokens:', error.message || 'Unknown error');
  }
}

main(); 