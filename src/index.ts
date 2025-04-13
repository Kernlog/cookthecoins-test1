import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { airdropTokens } from './airdrop';
import { isValidPublicKey } from './utils';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Define interface for the airdrop request body
interface AirdropRequest {
  pubkey: string;
  pubkeys: string[];
}

// Airdrop endpoint
app.post('/airdrop', (req, res) => {
  const handleAirdrop = async () => {
    try {
      const { pubkey, pubkeys } = req.body as AirdropRequest;

      // Validate request parameters
      if (!pubkey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing recipient pubkey' 
        });
      }

      if (!Array.isArray(pubkeys) || pubkeys.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing or invalid mint pubkeys array' 
        });
      }

      // Validate recipient pubkey
      if (!isValidPublicKey(pubkey)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid recipient pubkey format' 
        });
      }

      // Limit number of mints to prevent abuse
      const MAX_MINTS = 20;
      const mintAddresses = pubkeys.slice(0, MAX_MINTS);

      // Call airdrop function
      const result = await airdropTokens(pubkey, mintAddresses);
      
      if (result.success) {
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

// Start server
app.listen(port, () => {
  console.log(`Airdrop server running on port ${port}`);
  console.log(`Test with: curl -X POST http://localhost:${port}/airdrop -H "Content-Type: application/json" -d '{"pubkey":"<RECIPIENT_PUBKEY>","pubkeys":["<MINT_PUBKEY1>","<MINT_PUBKEY2>"]}'`);
});
