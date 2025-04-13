import { 
  Connection, 
  Keypair, 
  PublicKey
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
