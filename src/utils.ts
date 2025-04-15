import { 
  Connection, 
  Keypair, 
  PublicKey,
  AccountInfo,
  ParsedAccountData
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

/**
 * Get a connection to the Solana network
 */
export const getConnection = (): Connection => {
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const endpoint = network === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com' 
    : 'https://api.devnet.solana.com';
  
  return new Connection(endpoint, 'confirmed');
};

/**
 * Create a Keypair from a private key
 */
export const getKeypairFromPrivateKey = (privateKey: string): Keypair => {
  try {
    const decodedKey = Buffer.from(privateKey, 'base64');
    return Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    console.error('Error creating keypair:', error);
    throw new Error('Invalid private key format');
  }
};

/**
 * Validate a Solana public key
 */
export const isValidPublicKey = (pubkey: string): boolean => {
  try {
    new PublicKey(pubkey);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Chunk an array into smaller arrays of specified size
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Find token accounts for a wallet by token mint
 */
export const findTokenAccountsByMint = async (
  connection: Connection,
  ownerAddress: PublicKey,
  mintAddress: PublicKey
): Promise<PublicKey | null> => {
  try {
    console.log(`Looking for token accounts for mint ${mintAddress.toString()} owned by ${ownerAddress.toString()}`);
    
    // Get all token accounts for the owner
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      ownerAddress,
      {
        programId: TOKEN_PROGRAM_ID
      }
    );
    
    console.log(`Found ${tokenAccounts.value.length} token accounts for ${ownerAddress.toString()}`);

    // Log all token accounts for debugging
    for (let i = 0; i < tokenAccounts.value.length; i++) {
      try {
        const accountInfo = await connection.getAccountInfo(tokenAccounts.value[i].pubkey);
        if (accountInfo && accountInfo.data.length >= 165) {
          const data = accountInfo.data;
          try {
            const accountMint = new PublicKey(data.slice(0, 32));
            console.log(`Token account ${i+1}: ${tokenAccounts.value[i].pubkey.toString()}, Mint: ${accountMint.toString()}`);
            
            // Basic check by string comparison
            if (accountMint.toString() === mintAddress.toString()) {
              console.log(`Found token account ${tokenAccounts.value[i].pubkey.toString()} for mint ${mintAddress.toString()}`);
              return tokenAccounts.value[i].pubkey;
            }
          } catch (e) {
            console.error(`Error parsing mint from token account ${i+1}:`, e);
          }
        } else {
          console.log(`Token account ${i+1}: ${tokenAccounts.value[i].pubkey.toString()} - Invalid data format`);
        }
      } catch (err) {
        console.error(`Error checking token account ${i+1}:`, err);
      }
    }

    // Try using getOrCreateAssociatedTokenAccount as a fallback
    try {
      console.log(`Trying to get ATA for mint ${mintAddress.toString()}`);
      const keypair = Keypair.generate(); // Dummy keypair just for the call
      const associatedTokenAccount = await connection.getTokenAccountsByOwner(
        ownerAddress,
        { mint: mintAddress }
      );
      
      if (associatedTokenAccount.value.length > 0) {
        console.log(`Found associated token account: ${associatedTokenAccount.value[0].pubkey.toString()}`);
        return associatedTokenAccount.value[0].pubkey;
      }
    } catch (e: any) {
      console.log(`Error getting ATA: ${e.message}`);
    }
    
    console.log(`No token account found for mint ${mintAddress.toString()}`);
    return null;
  } catch (error) {
    console.error(`Error finding token accounts:`, error);
    return null;
  }
};
