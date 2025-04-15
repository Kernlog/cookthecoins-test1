# Solana Token Airdrop Service

A Node.js service that airdrops six specific SPL tokens to a provided wallet address. Each time the endpoint is called, the recipient receives 10,000 tokens of each mint. A rate limit ensures each wallet can only receive tokens once every 24 hours.

## Predefined Token Mints

This service automatically airdrops 10,000 tokens of each of these mints:

```
SPCE6iLxvzex34CKUTCpZS6yKuCQ2WjmUKpMkVyM5oq
eNCE6f7PKP5gZnQAvnsc5fU3pFLV32EK2uniy9bKtqj
CHMXBBEJQtF86V83ZviMty4rnGRjETUfZtK4kyuVtFno
embrvPr95mhmHeH1MBruG4uyaAqhjsZxpPYP1cuPM6b
moonPpxqwDtARANqx1VAnpSHwpGe2fmPm7QqujfjVgJ
DoreKQVTy6oPWgmvBy4FmCoED6oFrLSME1yE8BRtgMp6
```

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

2. **Generate Airdrop Wallet** (optional, only if you want a new wallet):
   ```bash
   npx ts-node src/generate-wallet.ts
   ```
   Output example:
   ```
   Generated new Solana wallet:
   Public Key (address): DVYBF3usTgqye7vVTGz3H3vc7BYfg21AeGAxRadSWT7k
   Private Key (base64): FJql1T...
   ```

3. **Update .env file**:
   ```
   PORT=10000
   SOLANA_NETWORK=devnet
   AIRDROP_WALLET_PRIVATE_KEY=your_generated_private_key_here
   ```

4. **Check Airdrop Wallet Balance**:
   ```bash
   npx ts-node src/check-airdrop-wallet.ts
   ```
   This will check if your airdrop wallet has sufficient tokens of all required mints.

5. **Build the project** (optional for production):
   ```bash
   npm run build
   ```

## Testing

1. **Start the Server**:
   ```bash
   npm run dev
   ```

2. **Test the Airdrop**:
   ```bash
   curl -X POST http://localhost:10000/airdrop \
     -H "Content-Type: application/json" \
     -d '{"pubkey":"RECIPIENT_PUBKEY"}'
   ```

3. **Check Airdrop Eligibility**:
   ```bash
   curl http://localhost:10000/airdrop/check/RECIPIENT_PUBKEY
   ```
   This endpoint will tell you if a wallet is eligible for an airdrop and if not, how much time remains.

4. **Generate Test Recipient** (optional, for testing):
   ```bash
   npx ts-node src/generate-test-recipient.ts
   ```
   This will create a test wallet to receive tokens and show a test command.

## API

**Airdrop Tokens**
- Endpoint: `POST /airdrop`
- Request body:
  ```json
  {
    "pubkey": "8hy9PkuSmdfEJdN5zJ3FqytMn7AyzDRM3kkN74aRKoJQ"
  }
  ```
- Response (Success):
  ```json
  {
    "success": true,
    "results": [
      {
        "mint": "SPCE6iLxvzex34CKUTCpZS6yKuCQ2WjmUKpMkVyM5oq",
        "success": true,
        "signature": "5UAPzLUQWMTQTQDDBqGStSEQDhBWKBUyQHifzNcmna8fvzSJphbd5j9PP6SsGQG9et7vVTHqCXrXmVmULFpGELZ3"
      },
      ... // Results for other tokens
    ]
  }
  ```
- Response (Rate Limited):
  ```json
  {
    "success": false,
    "message": "Rate limit exceeded: Only one airdrop allowed per wallet every 24 hours",
    "timeRemaining": "23h 45m"
  }
  ```

**Check Eligibility**
- Endpoint: `GET /airdrop/check/:pubkey`
- Response:
  ```json
  {
    "pubkey": "8hy9PkuSmdfEJdN5zJ3FqytMn7AyzDRM3kkN74aRKoJQ",
    "eligible": false,
    "timeRemaining": "23h 45m"
  }
  ```

## Rate Limiting

- Each wallet can receive an airdrop only once every 24 hours
- The service stores airdrop history in `airdrop-history.json` in the project root
- Use the `/airdrop/check/:pubkey` endpoint to check if a wallet is eligible

## Deployment to Render

1. Create a Render account at [render.com](https://render.com)
2. Create a new Web Service and link your GitHub repository
3. Use the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set the environment variables:
   - `SOLANA_NETWORK`: `devnet`
   - `AIRDROP_WALLET_PRIVATE_KEY`: Your wallet's private key

## Features

- Airdrops six specific SPL tokens to a specified wallet
- REST API endpoint for programmatic access
- Sends 10,000 tokens per mint
- Rate limiting (one airdrop per wallet per 24 hours)
- Built on Express.js with TypeScript
- Devnet support