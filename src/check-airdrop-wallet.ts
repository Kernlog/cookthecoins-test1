import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Predefined token mints to check
const PREDEFINED_TOKEN_MINTS = [
  "SPCE6iLxvzex34CKUTCpZS6yKuCQ2WjmUKpMkVyM5oq",
  "eNCE6f7PKP5gZnQAvnsc5fU3pFLV32EK2uniy9bKtqj",
  "CHMXBBEJQtF86V83ZviMty4rnGRjETUfZtK4kyuVtFno",
  "embrvPr95mhmHeH1MBruG4uyaAqhjsZxpPYP1cuPM6b",
  "moonPpxqwDtARANqx1VAnpSHwpGe2fmPm7QqujfjVgJ",
  "DoreKQVTy6oPWgmvBy4FmCoED6oFrLSME1yE8BRtgMp6"
];

async function main() {
  try {
    // Get airdrop wallet private key from environment
    const privateKeyBase64 = process.env.AIRDROP_WALLET_PRIVATE_KEY;
    if (!privateKeyBase64) {
      throw new Error('AIRDROP_WALLET_PRIVATE_KEY not found in environment variables');
    }
    
    // Get wallet public key
    const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');
    const keypair = Keypair.fromSecretKey(privateKeyBuffer);
    const walletPublicKey = keypair.publicKey;
    
    console.log('Checking balances for airdrop wallet:', walletPublicKey.toString());
    
    // Create connection to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Check SOL balance
    const solBalance = await connection.getBalance(walletPublicKey);
    console.log(`SOL balance: ${solBalance / 1000000000} SOL`);
    
    // Check token balances
    console.log('\nToken balances:');
    let hasAllTokens = true;
    
    for (const mintAddress of PREDEFINED_TOKEN_MINTS) {
      try {
        const mint = new PublicKey(mintAddress);
        const tokenAddress = await getAssociatedTokenAddress(
          mint,
          walletPublicKey
        );
        
        try {
          const account = await getAccount(connection, tokenAddress);
          const balance = Number(account.amount) / 1000000000;
          console.log(`${mintAddress}: ${balance} tokens`);
          
          if (balance < 10000) {
            console.log(`⚠️ LOW BALANCE: Less than 10,000 tokens available for ${mintAddress}`);
            hasAllTokens = false;
          }
        } catch (err) {
          console.log(`❌ ${mintAddress}: No token account found`);
          hasAllTokens = false;
        }
      } catch (err) {
        const error = err as Error;
        console.log(`❌ ${mintAddress}: Error checking balance: ${error.message || 'Unknown error'}`);
        hasAllTokens = false;
      }
    }
    
    if (hasAllTokens) {
      console.log('\n✅ Airdrop wallet has all required tokens!');
    } else {
      console.log('\n❌ Airdrop wallet is missing some tokens or has insufficient balance.');
      console.log('Please make sure the wallet has at least 10,000 tokens of each mint before deploying.');
    }
    
  } catch (err) {
    const error = err as Error;
    console.error('Error checking balances:', error.message || 'Unknown error');
  }
}

main(); 