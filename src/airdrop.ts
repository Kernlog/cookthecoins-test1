import { Connection, PublicKey, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction, 
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { getConnection, getKeypairFromPrivateKey, chunkArray, sleep, isValidPublicKey } from './utils';
import dotenv from 'dotenv';

dotenv.config();

// Number of tokens to send per airdrop (10,000)
const TOKENS_PER_AIRDROP = 10000;
// Handle decimal places for token (9 decimals is standard for Solana tokens)
const DECIMALS = 9;
// Amount to transfer in smallest units (10,000 * 10^9)
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
    // Get sender token account
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      mint,
      sender.publicKey
    );

    // Get destination token account
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      mint,
      destination
    );

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,
      destinationTokenAccount.address,
      sender.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);
    
    return signature;
  } catch (error) {
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

    // Convert string to PublicKey
    const recipient = new PublicKey(recipientPubkey);
    
    // Process mints in batches
    const mintBatches = chunkArray(validMints, BATCH_SIZE);
    const results: TransferResult[] = [];

    for (const [batchIndex, batch] of mintBatches.entries()) {
      // Process each mint in the batch
      const batchPromises = batch.map(async (mintAddress): Promise<TransferResult> => {
        try {
          const mint = new PublicKey(mintAddress);
          const signature = await transferTokens(connection, sender, mint, recipient);
          return {
            mint: mintAddress,
            success: true,
            signature
          };
        } catch (err) {
          const error = err as Error;
          return {
            mint: mintAddress,
            success: false,
            error: error.message || 'Unknown error'
          };
        }
      });

      // Wait for all transfers in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (batchIndex < mintBatches.length - 1) {
        await sleep(BATCH_DELAY);
      }
    }

    return {
      success: true,
      results
    };
  } catch (err) {
    console.error(`Error in airdrop:`, err);
    const error = err as Error;
    return {
      success: false,
      results: [{
        error: error.message || 'Unknown error'
      }]
    };
  }
}
