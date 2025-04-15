import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { airdropTokens, ensureTokenAccounts } from './airdrop';
import { isValidPublicKey, getConnection, getKeypairFromPrivateKey } from './utils';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Define interface for the airdrop request body
interface AirdropRequest {
  pubkey: string;
}

// Interface for tracking airdrop history
interface AirdropHistory {
  [walletAddress: string]: {
    lastAirdropTimestamp: number;
  };
}

// Predefined token mints to airdrop
const PREDEFINED_TOKEN_MINTS = [
  "SPCE6iLxvzex34CKUTCpZS6yKuCQ2WjmUKpMkVyM5oq", // SPICE
  "eNCE6f7PKP5gZnQAvnsc5fU3pFLV32EK2uniy9bKtqj", // EVERYTHING NICE
  "CHMXBBEJQtF86V83ZviMty4rnGRjETUfZtK4kyuVtFno", // CHEMICAL X
  "embrvPr95mhmHeH1MBruG4uyaAqhjsZxpPYP1cuPM6b", // EMBER SALT
  "moonPpxqwDtARANqx1VAnpSHwpGe2fmPm7QqujfjVgJ", // Moonpetal Bloom
  "DoreKQVTy6oPWgmvBy4FmCoED6oFrLSME1yE8BRtgMp6"  // devORE
];

// Our airdrop wallet public key
const AIRDROP_WALLET_PUBKEY = 'DVYBF3usTgqye7vVTGz3H3vc7BYfg21AeGAxRadSWT7k';

// Rate limit duration in milliseconds (24 hours)
const RATE_LIMIT_DURATION = 24 * 60 * 60 * 1000;

// Path to the file storing airdrop history
const HISTORY_FILE_PATH = path.join(__dirname, '..', 'airdrop-history.json');

// Load existing airdrop history or create a new one
let airdropHistory: AirdropHistory = {};

try {
  if (fs.existsSync(HISTORY_FILE_PATH)) {
    const historyData = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
    airdropHistory = JSON.parse(historyData);
    console.log('Loaded airdrop history from file');
  } else {
    console.log('No existing airdrop history found, starting fresh');
  }
} catch (error) {
  console.error('Error loading airdrop history, starting fresh:', error);
}

// Function to save airdrop history to file
function saveAirdropHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(airdropHistory, null, 2));
  } catch (error) {
    console.error('Error saving airdrop history:', error);
  }
}

// Check if a wallet is eligible for an airdrop
function isEligibleForAirdrop(walletAddress: string): boolean {
  const now = Date.now();
  const walletHistory = airdropHistory[walletAddress];
  
  // If no history, they are eligible
  if (!walletHistory) {
    return true;
  }
  
  // Check if 24 hours have passed since the last airdrop
  const timeSinceLastAirdrop = now - walletHistory.lastAirdropTimestamp;
  return timeSinceLastAirdrop >= RATE_LIMIT_DURATION;
}

// Update airdrop history for a wallet
function updateAirdropHistory(walletAddress: string) {
  airdropHistory[walletAddress] = {
    lastAirdropTimestamp: Date.now()
  };
  saveAirdropHistory();
}

// Calculate time remaining until next eligible airdrop
function getTimeRemainingForAirdrop(walletAddress: string): string {
  const walletHistory = airdropHistory[walletAddress];
  if (!walletHistory) {
    return 'Eligible now';
  }
  
  const now = Date.now();
  const timeSinceLastAirdrop = now - walletHistory.lastAirdropTimestamp;
  
  if (timeSinceLastAirdrop >= RATE_LIMIT_DURATION) {
    return 'Eligible now';
  }
  
  const timeRemaining = RATE_LIMIT_DURATION - timeSinceLastAirdrop;
  const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${hoursRemaining}h ${minutesRemaining}m`;
}

// Airdrop endpoint
app.post('/airdrop', (req, res) => {
  const handleAirdrop = async () => {
    try {
      const { pubkey } = req.body as AirdropRequest;

      // Validate request parameters
      if (!pubkey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing recipient pubkey' 
        });
      }

      // Validate recipient pubkey
      if (!isValidPublicKey(pubkey)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid recipient pubkey format' 
        });
      }

      // Check if the wallet is eligible for an airdrop
      if (!isEligibleForAirdrop(pubkey)) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded: Only one airdrop allowed per wallet every 24 hours',
          timeRemaining: getTimeRemainingForAirdrop(pubkey)
        });
      }

      // Call airdrop function with predefined token mints
      const result = await airdropTokens(pubkey, PREDEFINED_TOKEN_MINTS);
      
      if (result.success) {
        // Update airdrop history
        updateAirdropHistory(pubkey);
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (err) {
      console.error('Error processing airdrop request:', err);
      const error = err as Error;
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error', 
        error: error.message || 'Unknown error'
      });
    }
  };

  handleAirdrop();
});

// Endpoint to check eligibility for airdrop
app.get('/airdrop/check/:pubkey', (req, res) => {
  const checkEligibility = () => {
    try {
      const { pubkey } = req.params;
      
      // Validate pubkey
      if (!isValidPublicKey(pubkey)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid pubkey format' 
        });
      }
      
      const eligible = isEligibleForAirdrop(pubkey);
      
      res.status(200).json({
        pubkey,
        eligible,
        timeRemaining: eligible ? 'Eligible now' : getTimeRemainingForAirdrop(pubkey)
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ 
        success: false, 
        message: 'Error checking eligibility', 
        error: error.message || 'Unknown error'
      });
    }
  };

  checkEligibility();
});

// Temporary endpoint to reset a wallet's airdrop history (for testing)
app.get('/reset-airdrop/:pubkey', (req, res) => {
  const resetAirdropHistory = () => {
    try {
      const { pubkey } = req.params;
      
      // Validate pubkey
      if (!isValidPublicKey(pubkey)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid pubkey format' 
        });
      }
      
      // Check if wallet exists in history
      if (airdropHistory[pubkey]) {
        // Delete the wallet from history
        delete airdropHistory[pubkey];
        saveAirdropHistory();
        
        return res.status(200).json({
          success: true,
          message: `Rate limit reset for wallet: ${pubkey}`
        });
      } else {
        return res.status(404).json({
          success: false,
          message: `Wallet not found in airdrop history: ${pubkey}`
        });
      }
    } catch (err) {
      const error = err as Error;
      return res.status(500).json({
        success: false,
        message: 'Error resetting airdrop history',
        error: error.message || 'Unknown error'
      });
    }
  };

  resetAirdropHistory();
});

// Endpoint to initialize token accounts for the airdrop wallet
app.get('/init-accounts', (req, res) => {
  const initializeAccounts = async () => {
    try {
      // Get airdrop wallet private key
      const privateKey = process.env.AIRDROP_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        return res.status(500).json({
          success: false,
          message: 'Airdrop wallet private key not found in environment variables'
        });
      }

      // Get connection and sender wallet
      const connection = getConnection();
      const sender = getKeypairFromPrivateKey(privateKey);
      console.log(`Using airdrop wallet: ${sender.publicKey.toString()}`);

      // Ensure token accounts exist for all mints
      await ensureTokenAccounts(connection, sender, PREDEFINED_TOKEN_MINTS);

      return res.status(200).json({
        success: true,
        message: 'Token accounts initialized',
        wallet: sender.publicKey.toString(),
        mints: PREDEFINED_TOKEN_MINTS
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error initializing token accounts:', error);
      return res.status(500).json({
        success: false,
        message: 'Error initializing token accounts',
        error: error.message || 'Unknown error'
      });
    }
  };

  initializeAccounts();
});

// Start server
app.listen(port, () => {
  console.log(`Airdrop server running on port ${port}`);
  console.log(`Test with: curl -X POST http://localhost:${port}/airdrop -H "Content-Type: application/json" -d '{"pubkey":"<RECIPIENT_PUBKEY>"}'`);
  console.log(`Check eligibility: curl http://localhost:${port}/airdrop/check/<RECIPIENT_PUBKEY>`);
});
