import * as solanaWeb3 from '@solana/web3.js';
import * as dotenv from 'dotenv';

import { client } from './db/db';
import { sleep, saveTokenToDatabase, convertToTokenInfo, removeFromDatabase } from './rugchecker/utils/helper';
import { sendTelegramAlert } from './sendtgalert';
import { getSolPriceInUSD } from './rugchecker/utils/helper';
import SPLRugchecker from './rugchecker/index';

dotenv.config();

// Helius RPC URL
const heliusRpcUrl = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
const heliusWs = `${process.env.HELIUS_WS_URL}${process.env.HELIUS_API_KEY}`;
// console.log(">> helius api url: ", heliusRpcUrl);
console.log("--------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>> new token <<<<<<<<<<<<<<<<<<<<<<<<<<<<---------------------------");

// Ensure that the wsEndpoint is provided in the connection config
const web3ConnectionConfig: solanaWeb3.ConnectionConfig = {
  wsEndpoint: heliusWs,
  commitment: "confirmed"
};

const web3 = new solanaWeb3.Connection(heliusRpcUrl, web3ConnectionConfig);

const raydiumProgramId = new solanaWeb3.PublicKey(String(process.env.RAYDIUM_PROGRAM_KEY));
const rugCheckConfig = {
  solanaRpcEndpoint: `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`,
  heliusApiKey: process.env.HELIUS_API_KEY
}

function extractMintAccountFromTransaction(transaction: any): [solanaWeb3.PublicKey | null, solanaWeb3.PublicKey | null] {
  try {
    const staticAccountKeys = transaction.transaction.message.staticAccountKeys;
    const compiledInstructions = transaction.transaction.message.compiledInstructions;

    for (const instruction of compiledInstructions) {
      const programIdIndex = instruction.programIdIndex;
      const programId = staticAccountKeys[programIdIndex].toBase58();

      if (programId === String(process.env.RAYDIUM_PROGRAM_KEY)) {
        const instructionData = Buffer.from(instruction.data, 'hex');

        if (instructionData.length > 0) {
          const accountKeyIndexes = instruction.accountKeyIndexes;
          // for (let i = 0; i < accountKeyIndexes.length; i++) {
          //   console.log(">>i = ", i, " >> account indexes", accountKeyIndexes[i], " address:", staticAccountKeys[accountKeyIndexes[i]].toBase58())
          // }
          const mintAccountIndex = accountKeyIndexes[8];
          const poolIndex = accountKeyIndexes[4];
          return [
            staticAccountKeys[mintAccountIndex] || null,
            staticAccountKeys[poolIndex] || null
          ]; // Ensure a PublicKey or null is returned
        }
      }
    }

    return [null, null]; // No mint account found
  } catch (error) {
    console.error("Error extracting mint account:", error);
    return [null, null];
  }
}

async function checkTokenFromDatabase() {
  const tokens = await client.query(
    `SELECT * FROM new_tokens`
  );
  if (tokens.rowCount > 0) {
    tokens.rows.map(async (token: any) => {
      const created_at = new Date(token.created_at).getTime();
      const current_date = Date.now();
      const time_interval = 60 * 1000;
      console.log("current_date: ", current_date);
      console.log("created_at: ", created_at);
      console.log("interval: ", current_date - created_at);
      if ((current_date - created_at) >= time_interval && (current_date - created_at) < 2 * time_interval) {
        const rugChecker = new SPLRugchecker(rugCheckConfig);
        const result = await rugChecker.check(token.token_address, token.pool_address);
        console.log("totalLiquidityAmountInUSD", result.liquidity.totalLiquidityAmountInUSD, "\n token address: ", token.token_address);
        if (result.liquidity.totalLiquidityAmountInUSD < 3000) {
          console.warn(`🤣🤣🤣🤣>> total liquidity is less than 3000 usd. token address: ${token.token_address}`);
          return;
        }
        if (result.metadata.isMutable) {
          console.warn(`🤔🤔🤔🤔>> This token is mutable. token address: ${token.token_address}`);
          return;
        }
        const rugInfo = await rugChecker.rugScoreWithApi(token.token_address);
        const hasCopycatRisk = rugInfo.risks.some((risk) => risk.name.toLowerCase().includes('copycat'));
        if (hasCopycatRisk) {
          console.warn(`😜😜😜😜>> This is copycat token. token address ${token.token_address}`);
          return;
        }
        if (rugInfo.score > 400) {
          const removed = await removeFromDatabase(token.id);
          if (removed) {
            console.log(">>>>>>>>>> Token removed from database: Reason recheck rug", token.token_address);
          }
        } else {
          const tokenInfo = convertToTokenInfo(result, token.token_address);
          sendTelegramAlert(tokenInfo, rugInfo);
        }
      } else if ((current_date - created_at) > 2 * time_interval) {
        const removed = await removeFromDatabase(token.id);
        if (removed) {
          console.log(">>>>>>>>>> Token removed from database: Reason: old token", token.token_address);
        }
      }
    });
  }
}

const main = async (): Promise<void> => {
  const block = await web3.getLatestBlockhash();
  console.log("block: ", block);
  await getSolPriceInUSD();
  //get sol price every 1 minute
  setInterval(getSolPriceInUSD, 60 * 1000);

  //recheck rug from database
  setInterval(checkTokenFromDatabase, 60 * 1000);

  web3.onLogs(
    raydiumProgramId,
    async (logInfo) => {
      if (logInfo.logs.some(log => log.includes("initialize2"))) {
        console.log("Detected pool creation event.");

        try {
          const transaction = await web3.getTransaction(logInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (transaction) {
            const [mintAccount, poolAddress] = extractMintAccountFromTransaction(transaction as any); // Type assertion
            if (mintAccount && poolAddress) {
              console.log("✔✔✔>>Mint Account:", mintAccount.toBase58());
              console.log("✔✔✔>>Pool Address:", poolAddress.toBase58());
              if (mintAccount.toBase58() === String(process.env.WRAPPED_SOL_TOKEN)) return;
              await sleep(20000);
              const rugChecker = new SPLRugchecker(rugCheckConfig);
              const result = await rugChecker.check(mintAccount.toBase58(), poolAddress.toBase58());
              console.log("totalLiquidityAmountInUSD", result.liquidity.totalLiquidityAmountInUSD, `\ntokenAddress: ${mintAccount.toBase58()}`);
              if (result.liquidity.totalLiquidityAmountInUSD < 3000) {
                console.warn(`🤣🤣🤣>> total liquidity is less than 3000 usd. tokenAddress: ${mintAccount.toBase58()}`);
                return;
              }
              if (result.metadata.isMutable) {
                console.warn(`🤔🤔🤔>> This token is mutable. tokenAddress: ${mintAccount.toBase58()}`);
                return;
              }
              const rugInfo = await rugChecker.rugScoreWithApi(mintAccount.toBase58());
              const hasCopycatRisk = rugInfo.risks.some((risk) => risk.name.toLowerCase().includes('copycat'));
              if (hasCopycatRisk) {
                console.warn(`😜😜😜>> This is copycat token. tokenAddress: ${mintAccount.toBase58()}`);
                return;
              }
              if (rugInfo.score > 400) {
                await saveTokenToDatabase(result, mintAccount.toBase58(), poolAddress.toBase58(), rugInfo);
                console.log(`😊😊😊>> New token info is stored into database! tokenAddress: ${mintAccount.toBase58()}`);
              } else {
                const tokenInfo = convertToTokenInfo(result, mintAccount.toBase58());
                sendTelegramAlert(tokenInfo, rugInfo);
              }
              // const nomalizedRugScore = rugChecker.isRug(result);
              // console.log(">> nomalizedRugScore -> ", nomalizedRugScore);
            }
          } else {
            console.log("Transaction is null");
          }
        } catch (error) {
          console.error("Error processing transaction:", error);
        }
      }
    },
    'confirmed'
  );
}

main();