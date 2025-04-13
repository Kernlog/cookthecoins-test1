# Solana Token Airdrop Service

A Node.js service that airdrops SPL tokens to specified wallets. This service accepts a base58 pubkey and an array of token mints, then sends 10,000 tokens of each mint to the specified pubkey.

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Solana wallet with SPL tokens to distribute
- Basic understanding of Solana and SPL tokens

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Airdrop Wallet**:
   ```bash
   npx ts-node src/generate-wallet.ts
   ```
   This will create a new wallet that will be used to send tokens. The output looks like:
   ```
   Generated new Solana wallet:
   Public Key (address): DVYBF3usTgqye7vVTGz3H3vc7BYfg21AeGAxRadSWT7k
   Private Key (base64): FJql1T...
   ```

3. **Update .env file**:
   ```
   PORT=3000
   SOLANA_NETWORK=devnet
   AIRDROP_WALLET_PRIVATE_KEY=your_generated_private_key_here
   ```

4. **Build the project** (optional for production):
   ```bash
   npm run build
   ```

## Testing Workflow

This project includes utility scripts that make it easy to test the entire airdrop flow from start to finish.

### Complete Test Flow

1. **Generate Sender Wallet**:
   ```bash
   npx ts-node src/generate-wallet.ts
   ```
   - Creates wallet.json
   - Copy the private key to your .env file

2. **Setup Test Tokens**:
   ```bash
   npx ts-node src/setup-test-tokens.ts
   ```
   - Requests SOL from devnet faucet
   - Creates 3 test SPL tokens
   - Mints 100,000 of each token to the sender wallet
   - Saves token information to test-tokens.json

3. **Generate Test Recipient**:
   ```bash
   npx ts-node src/generate-test-recipient.ts
   ```
   - Creates a recipient wallet (recipient-wallet.json)
   - Outputs a ready-to-use curl command for testing

4. **Start the Server**:
   ```bash
   npm run dev
   ```

5. **Test the Airdrop**:
   - Use the curl command provided by the generate-test-recipient script
   - Or manually:
   ```bash
   curl -X POST http://localhost:3000/airdrop \
     -H "Content-Type: application/json" \
     -d '{"pubkey":"RECIPIENT_PUBKEY","pubkeys":["MINT1","MINT2","MINT3"]}'
   ```

6. **Check Recipient Balances**:
   ```bash
   npx ts-node src/check-balances.ts
   ```
   - Reads wallet information from recipient-wallet.json
   - Reads token information from test-tokens.json
   - Shows token balances for the recipient wallet
   - Successful if recipient has 10,000 tokens of each mint

### Testing Without Setup Scripts

If you already have:
- A wallet with SOL on devnet
- SPL tokens that you own

You can:
1. Set the private key in .env
2. Start the server with `npm run dev`
3. Send a POST request to /airdrop with your recipient and token mints

## API

**Airdrop Tokens**
- Endpoint: `POST /airdrop`
- Request body:
  ```json
  {
    "pubkey": "8hy9PkuSmdfEJdN5zJ3FqytMn7AyzDRM3kkN74aRKoJQ",
    "pubkeys": [
      "3fN5Qowk5FYy1ZQnWpaWD34Rp4dVUN4qxBCoDv3PeQNR",
      "5Gdzv8AYjT3RZVJzXAd9htZ5jM5QkJJDtwypxY9oLsbb"
    ]
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "results": [
      {
        "mint": "3fN5Qowk5FYy1ZQnWpaWD34Rp4dVUN4qxBCoDv3PeQNR",
        "success": true,
        "signature": "5UAPzLUQWMTQTQDDBqGStSEQDhBWKBUyQHifzNcmna8fvzSJphbd5j9PP6SsGQG9et7vVTHqCXrXmVmULFpGELZ3"
      },
      {
        "mint": "5Gdzv8AYjT3RZVJzXAd9htZ5jM5QkJJDtwypxY9oLsbb",
        "success": true,
        "signature": "2vdJwM8rWJVMgsqKkKYJbk1hhzrygQ8gKdvnKTbxBcyGKMCEgDLDEVw9HsqB7ozXNNjCzVpX4JDLcL78aXBwxTXF"
      }
    ]
  }
  ```

## Features

- Airdrop multiple SPL tokens to a specified wallet
- REST API endpoint for programmatic access
- Configurable token amount (defaults to 10,000 tokens per mint)
- Built on Express.js with TypeScript
- Devnet support (can be configured for mainnet)