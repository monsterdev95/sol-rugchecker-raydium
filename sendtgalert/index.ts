import TelegramBot from 'node-telegram-bot-api';

export async function sendTelegramAlert(tokenInfo: any, rugCheckResult: any): Promise<void> {
  const telegramBotToken = String(process.env.TELEGRAM_BOT_TOKEN);
  // const telegramChatId = String(process.env.TELEGRAM_CHAT_ID);
  const channelUserName = String(process.env.CHANNEL_USER_NAME);
  const bot = new TelegramBot(telegramBotToken, { polling: false });
  let channelId = "";
  await bot
    .getChat(channelUserName)
    .then((chat: any) => {
      channelId = chat.id;
    })
  const message = `
    😎New Token Detected!😎
    1. Dex:  ${tokenInfo.dextoolUrl}
    2. Token Name:  ${tokenInfo.name}
    3. Symbol:  ${tokenInfo.symbol}
    4. Contract Address:\n  ${tokenInfo.tokenAddress}
    5. Social Networks:\n${tokenInfo.telegram && tokenInfo.telegram !== 'undefined' &&
    `        -type: ${'telegram'}\n` + `         link: ${tokenInfo.telegram} \n`
    }
    ${tokenInfo.website && tokenInfo.website !== 'undefined' &&
    `        -type: ${'website'}\n` + `         link: ${tokenInfo.website} \n`
    }
    ${tokenInfo.twitter && tokenInfo.twitter !== 'undefined' &&
    `        -type: ${'twitter'}\n` + `         link: ${tokenInfo.twitter} \n`
    }
    6. Current Price (usd):  ${tokenInfo.price_usd}
    7. Liquidity Amount (usd):  ${tokenInfo.liquidity_amount_usd}
    8. RugCheckRisk:\n${rugCheckResult.risks?.map((item: any, index: number) => {
      return `      Risk${index + 1}\n         -name: ${item.name}\n         -value: ${item.value}\n         -description: ${item.description}\n         -score: ${item.score}\n         -level: ${item.level}\n`
    })}
    `;
  try {
    await bot.sendMessage(channelId, message);
    console.log('😊😊😊Telegram alert sent.');
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
  }
}
