import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

// Define interfaces for our JSON data
interface RecipientWallet {
  publicKey: string;
  privateKey: string;
}

interface TestTokens {
  walletAddress: string;
  tokenMints: string[];
}

async function main() {
  try {
    // Read the recipient wallet data
    const recipientWalletFile = fs.readFileSync('recipient-wallet.json', 'utf-8');
    const recipientData = JSON.parse(recipientWalletFile) as RecipientWallet;
    const recipientPublicKey = new PublicKey(recipientData.publicKey);
    
    console.log('Checking balances for recipient:', recipientData.publicKey);
    
    // Read the test tokens
    const testTokensFile = fs.readFileSync('test-tokens.json', 'utf-8');
    const testTokens = JSON.parse(testTokensFile) as TestTokens;
    
    // Create connection to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Check SOL balance
    const solBalance = await connection.getBalance(recipientPublicKey);
    console.log(`SOL balance: ${solBalance / 1000000000} SOL`);
    
    // Check token balances
    console.log('\nToken balances:');
    for (const mintAddress of testTokens.tokenMints) {
      try {
        const mint = new PublicKey(mintAddress);
        const tokenAddress = await getAssociatedTokenAddress(
          mint,
          recipientPublicKey
        );
        
        try {
          const account = await getAccount(connection, tokenAddress);
          console.log(`${mintAddress}: ${Number(account.amount) / 1000000000} tokens (10,000 tokens sent per airdrop)`);
        } catch (err) {
          const error = err as Error;
          console.log(`${mintAddress}: No account found (tokens may not have been received)`);
        }
      } catch (err) {
        const error = err as Error;
        console.log(`${mintAddress}: Error checking balance: ${error.message || 'Unknown error'}`);
      }
    }
    
    console.log('\nIf you see 10,000 tokens for each mint, the airdrop was successful!');
    
  } catch (err) {
    const error = err as Error;
    console.error('Error checking balances:', error.message || 'Unknown error');
  }
}

main(); 