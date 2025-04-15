import { Connection, PublicKey, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction, 
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { getConnection, getKeypairFromPrivateKey, chunkArray, sleep, isValidPublicKey } from './utils';
import dotenv from 'dotenv';

dotenv.config();

// Number of tokens to send per airdrop (1,000)
const TOKENS_PER_AIRDROP = 1000;
// Handle decimal places for token (9 decimals is standard for Solana tokens)
const DECIMALS = 9;
// Amount to transfer in smallest units (1,000 * 10^9)
const TRANSFER_AMOUNT = BigInt(TOKENS_PER_AIRDROP) * BigInt(10 ** DECIMALS);
// Batch size for processing multiple token mints
const BATCH_SIZE = 5;
// Delay between batches in milliseconds
const BATCH_DELAY = 2000;

// Define types for our result objects
type TransferSuccess = {
  mint: string;
  success: true;
  signature: string;
};

type TransferError = {
  mint: string;
  success: false;
  error: string;
};

type TransferResult = TransferSuccess | TransferError;

type AirdropResult = {
  success: boolean;
  results: TransferResult[] | { error: string }[];
};

/**
 * Transfer specified amount of tokens from source to destination
 */
export async function transferTokens(
  connection: Connection,
  sender: Keypair,
  mint: PublicKey,
  destination: PublicKey,
  amount: bigint = TRANSFER_AMOUNT
): Promise<string> {
  try {
    console.log(`Transferring tokens for mint: ${mint.toString()}`);
    
    // Find the existing token account for the sender
    const senderAccounts = await connection.getParsedTokenAccountsByOwner(
      sender.publicKey,
      { mint }
    );
    
    if (senderAccounts.value.length === 0) {
      throw new Error(`No token account found for mint ${mint.toString()} in the airdrop wallet`);
    }
    
    // Use the first token account found
    const senderTokenAddress = senderAccounts.value[0].pubkey;
    console.log(`Found sender token account: ${senderTokenAddress.toString()}`);
    
    // Get or create destination token account
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      mint,
      destination,
      true // Allow owner off curve
    );
    console.log(`Destination token account: ${destinationTokenAccount.address.toString()}`);
    
    // Create transfer instruction
    console.log(`Creating transfer instruction for ${amount} tokens`);
    const transferInstruction = createTransferInstruction(
      senderTokenAddress,
      destinationTokenAccount.address,
      sender.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    console.log(`Sending transaction...`);
    const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);
    console.log(`Transaction successful with signature: ${signature}`);
    
    return signature;
  } catch (error: any) {
    console.error(`Error transferring tokens:`, error);
    throw error;
  }
}

/**
 * Airdrop tokens to a specified wallet
 */
export async function airdropTokens(
  recipientPubkey: string,
  mintAddresses: string[]
): Promise<AirdropResult> {
  try {
    // Validate inputs
    if (!isValidPublicKey(recipientPubkey)) {
      throw new Error('Invalid recipient public key');
    }

    const validMints = mintAddresses.filter(mint => isValidPublicKey(mint));
    if (validMints.length === 0) {
      throw new Error('No valid mint addresses provided');
    }

    // Get airdrop wallet private key
    const privateKey = process.env.AIRDROP_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Airdrop wallet private key not found in environment variables');
    }

    // Get connection and sender wallet
    const connection = getConnection();
    const sender = getKeypairFromPrivateKey(privateKey);
    console.log(`Using airdrop wallet: ${sender.publicKey.toString()}`);

    // Convert string to PublicKey
    const recipient = new PublicKey(recipientPubkey);
    console.log(`Sending tokens to recipient: ${recipient.toString()}`);
    
    // Process mints in batches
    const mintBatches = chunkArray(validMints, BATCH_SIZE);
    const results: TransferResult[] = [];

    for (const [batchIndex, batch] of mintBatches.entries()) {
      console.log(`Processing batch ${batchIndex + 1} of ${mintBatches.length}`);
      
      // Process each mint in the batch
      const batchPromises = batch.map(async (mintAddress): Promise<TransferResult> => {
        try {
          console.log(`Attempting to airdrop tokens for mint: ${mintAddress}`);
          const mint = new PublicKey(mintAddress);
          const signature = await transferTokens(connection, sender, mint, recipient);
          return {
            mint: mintAddress,
            success: true,
            signature
          };
        } catch (err: any) {
          console.error(`Failed to airdrop tokens for mint ${mintAddress}:`, err);
          return {
            mint: mintAddress,
            success: false,
            error: err.message || 'Unknown error'
          };
        }
      });

      // Wait for all transfers in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      console.log(`Completed batch ${batchIndex + 1}`);

      // Add delay between batches to avoid rate limiting
      if (batchIndex < mintBatches.length - 1) {
        console.log(`Waiting ${BATCH_DELAY}ms before processing next batch...`);
        await sleep(BATCH_DELAY);
      }
    }

    return {
      success: true,
      results
    };
  } catch (err: any) {
    console.error(`Error in airdrop:`, err);
    return {
      success: false,
      results: [{
        error: err.message || 'Unknown error'
      }]
    };
  }
}
