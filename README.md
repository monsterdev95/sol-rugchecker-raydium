# Solana Token Detector and Rug Checker

## Overview

This TypeScript project detects new Solana tokens when liquidity pools are created on Raydium, gathers metadata and liquidity information, assesses potential rug pulls using the RugCheck API, and notifies a Telegram channel if a token is deemed safe.

## Features

- **Real-time Token Detection**: Monitors Raydium for new liquidity pool creations.
- **Metadata and Liquidity Analysis**: Utilizes APIs and SDKs to fetch token metadata, liquidity data, and holder information.
- **Rug Pull Detection**: Integrates with the RugCheck API to evaluate tokens for potential rug pulls.
- **Notification System**: Sends notifications to a Telegram channel for verified non-rug tokens.

## Installation

### Step 1: Clone the Repository

git clone https://github.com/monsterdev95/sol-rugchecker-raydium.git



### Step 2: Install Dependencies

Navigate into the project directory and install all required dependencies:

npm install


### Step 3: Install esrun Globally (Optional)

If you prefer to run TypeScript files directly without using `ts-node`, install `esrun` globally:

npm install -g esrun


## Running the Project

### Using `ts-node`

Add a script to your `package.json`:

"scripts": {
  "start": "ts-node src/index.ts"
}


Then run:

npm run start


### Using `esrun`

Add a script to your `package.json`:

"scripts": {
"start": "esrun src/index.ts"
}


Then run:

npm run start


Alternatively, if `esrun` is installed globally, you can run directly:

esrun src/index.ts


## Contributing

Contributions are welcome! Please submit pull requests with clear descriptions of changes.

## License

This project is licensed under the MIT License.

## Acknowledgments

- **Solana Blockchain**: For providing the infrastructure to monitor new token deployments.
- **Raydium DEX**: For offering a platform to track liquidity pool creations.
- **RugCheck API**: For providing critical rug pull assessment data.

## API Documentation

### APIs Used

- **Solana JSON RPC API**: For real-time monitoring of new token accounts.
- **RugCheck API**: For evaluating tokens for potential rug pulls.
- **Telegram Bot API**: For sending notifications.

### SDKs Used

- **@solana/web3.js**: For interacting with the Solana blockchain.

## Known Issues

- **Rate Limiting**: Be mindful of API rate limits when querying for data.
- **False Positives**: Rug pull detection may occasionally yield false positives.

## Future Development

- **Enhanced Rug Detection**: Integrate additional metrics for more accurate rug pull detection.
- **AI Support**: Use AI to check social media (It is critical to check rug).