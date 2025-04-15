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
    console.log(`Creating/getting token accounts for mint: ${mint.toString()}`);
    
    // Get sender token account with explicit error handling
    let senderTokenAccount;
    try {
      // Create sender token account if it doesn't exist
      const senderTokenAddress = await ensureSenderHasToken(connection, sender, mint);
      if (!senderTokenAddress) {
        throw new Error(`Unable to create or find token account for mint ${mint.toString()}`);
      }
      console.log(`Sender token account: ${senderTokenAddress.toString()}`);
      
      // Get destination token account
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
      console.error(`Error in transfer:`, error);
      throw new Error(error.message || "Unknown transfer error");
    }
  } catch (error: any) {
    console.error(`Error transferring tokens:`, error);
    throw error;
  }
}

/**
 * Get the address of the token account for a specific mint in the sender's wallet,
 * or create one if it doesn't exist.
 */
async function ensureSenderHasToken(
  connection: Connection,
  owner: Keypair,
  mint: PublicKey
): Promise<PublicKey | null> {
  try {
    // Try to find associated token account
    const associatedToken = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mint,
      owner.publicKey,
      true // Allow owner off curve
    );
    
    return associatedToken.address;
  } catch (error: any) {
    console.error(`Error ensuring sender has token:`, error);
    
    // If we couldn't create the token account, try to find it another way
    try {
      console.log(`Attempting to find token account through alternative method...`);
      // Try a different method to find existing token accounts
      const response = await connection.getParsedTokenAccountsByOwner(
        owner.publicKey,
        { mint }
      );
      
      console.log(`Found ${response.value.length} token accounts for this mint`);
      
      if (response.value.length > 0) {
        return response.value[0].pubkey;
      } else {
        console.log(`No token accounts found for mint ${mint.toString()}`);
        return null;
      }
    } catch (secondError: any) {
      console.error(`Alternative token account lookup failed:`, secondError);
      return null;
    }
  }
}

/**
 * Ensure that token accounts exist for the airdrop wallet for all mints
 */
export async function ensureTokenAccounts(
  connection: Connection,
  sender: Keypair,
  mintAddresses: string[]
): Promise<void> {
  try {
    console.log(`Ensuring token accounts exist for airdrop wallet...`);
    
    for (const mintAddress of mintAddresses) {
      try {
        const mint = new PublicKey(mintAddress);
        console.log(`Checking token account for mint: ${mintAddress}`);
        
        // First try to get all token accounts for the given mint
        const accounts = await connection.getParsedTokenAccountsByOwner(
          sender.publicKey,
          { mint }
        );
        
        if (accounts.value.length > 0) {
          console.log(`Found existing token account(s) for mint ${mintAddress}: ${accounts.value[0].pubkey.toString()}`);
          continue;
        }
        
        // If no accounts found, try to create one
        console.log(`No token accounts found for mint ${mintAddress}, attempting to create one...`);
        try {
          const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            sender,
            mint,
            sender.publicKey,
            true // Allow owner off curve
          );
          
          console.log(`Created token account ${tokenAccount.address.toString()} for mint ${mintAddress}`);
        } catch (creationError: any) {
          console.error(`Could not create token account for mint ${mintAddress}:`, creationError.message);
        }
      } catch (error: any) {
        console.error(`Error checking token account for mint ${mintAddress}:`, error.message);
      }
    }
    
    console.log(`Token account verification complete`);
  } catch (error: any) {
    console.error(`Error in ensureTokenAccounts:`, error.message);
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

    // Ensure token accounts exist for all mints
    await ensureTokenAccounts(connection, sender, validMints);

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
