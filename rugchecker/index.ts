import axios from 'axios';
import HoldersCheckConfig from "./model/config/holders-check";
import HoldersChecker from "./checker/holders-checker";
import RugCheckResult from "./model/result/rug-check";
import RugCheckConfig from "./model/config/rug-check";
import MarketdataChecker from "./checker/marketdata-checker";
import MarketdataCheckConfig from "./model/config/marketdata-check";
import MetadataChecker from "./checker/metadata-checker";
import MetadataCheckConfig from "./model/config/metadata-check";
import LiquidityChecker from './checker/liquidity-checker';
import LiquidityCheckConfig from "./model/config/liquidity-check";
// import { check_token_social_links } from './utils/helper';

export default class SPLRugchecker {
  private holdersChecker: HoldersChecker;
  private liquidityChecker: LiquidityChecker;
  private metadataChecker: MetadataChecker;
  // private marketdataChecker: MarketdataChecker;

  public constructor({ solanaRpcEndpoint, poolFilePath, poolAddress, heliusApiKey }: RugCheckConfig) {
    const metadataCheckConfig = { solanaRpcEndpoint: solanaRpcEndpoint, heliusApiKey: heliusApiKey };
    this.metadataChecker = new MetadataChecker(metadataCheckConfig);
    const holdersCheckConfig = { solanaRpcEndpoint: solanaRpcEndpoint };
    this.holdersChecker = new HoldersChecker(holdersCheckConfig);
    const liquidityCheckConfig = { solanaRpcEndpoint: solanaRpcEndpoint };
    this.liquidityChecker = new LiquidityChecker(liquidityCheckConfig);
  }

  async check(tokenAddress: string, poolAddress: string): Promise<RugCheckResult> {
    const [metadataCheckResult, holdersCheckResult, liquidityCheckResult] = await Promise.all([
      this.metadataChecker.check(tokenAddress),
      this.holdersChecker.check(tokenAddress),
      this.liquidityChecker.check(tokenAddress, poolAddress)
      // this.marketdataChecker.check(tokenAddress)
    ]);
    const rugCheckResult = new RugCheckResult();
    rugCheckResult.metadata = metadataCheckResult;
    rugCheckResult.holders = holdersCheckResult;
    rugCheckResult.liquidity = liquidityCheckResult;
    // rugCheckResult.marketdata = marketdataCheckResult;
    return rugCheckResult;
  }
  
  async rugScoreWithApi(tokenAddress: string): Promise<{ risks: any[], score: number }> {
    const rugcheckReportUrl = process.env.RUGCHECK_BASE_URL + `/tokens/${tokenAddress}/report/summary`;
    const response = await axios.get(rugcheckReportUrl);
    if (response.status === 200) {
      return { risks: response.data.risks, score: response.data.score };
    } else {
      return { risks: [], score: -1 }
    }
  }

  // rugScore(rugCheckResult: RugCheckResult): number {
  //   let rugScore = 0;
  //   //check if exist social media links
  //   if (!check_token_social_links(rugCheckResult.metadata)) {
  //     rugScore += 2000;
  //     console.log("log >>>>>>>>>>> This token has not social media links.");
  //   }
  //   //check if this token has no file metadata
  //   if (!rugCheckResult.metadata?.isValid) {
  //     rugScore += 100;
  //     console.log("log >>>>>>>>>>> This token has not meta data.");
  //   }
  //   //check if this token is mintable
  //   if (rugCheckResult.metadata.isMintable === true) {
  //     rugScore += 2500;
  //     console.log("log >>>>>>>>>>> This token is mintable.");
  //   }
  //   //check if this token is freezable
  //   if (rugCheckResult.metadata.isFreezable === true) {
  //     rugScore += 7500;
  //     console.log("log >>>>>>>>>>> This token is freezable.");
  //   }
  //   //check if this token is mutable
  //   if (rugCheckResult.metadata.isMutable === true) {
  //     rugScore += 10;
  //     console.log("log >>>>>>>>>>> This token is mutable.");
  //   }
  //   //check if Pump.fun contracts can be changed by Pump.fun at any time
  //   if (rugCheckResult.metadata.isPumpFun) {
  //     rugScore += 10;
  //     console.log("log >>>>>>>>>>> Pump.fun contracts can be changed by Pump.fun at any time");
  //   }
  //   //check if top 20 holders percentage >= 20
  //   if (rugCheckResult.holders.topHoldersPercentage >= 95) {
  //     rugScore += 20000;
  //   } else if (rugCheckResult.holders.topHoldersPercentage >= 20) {
  //     console.log("log>>>>>>>>>>>>>> top 20 holders percentage >= 20");
  //     rugScore += 5000;
  //   }
  //   //check if liquidity exists
  //   if (!rugCheckResult.liquidity.hasLiquidity) {
  //     rugScore += 20000;
  //     console.log("log >>>>>>>>>>> no liquidity.");
  //   } else {
  //     if (rugCheckResult.liquidity.lpReverse < 10) {
  //       //check if very low liquidity
  //       rugScore += 17500;
  //       console.log("log >>>>>>>>>>> very low liquidity.");
  //     } else if (rugCheckResult.liquidity.lpReverse < 100) {
  //       //check if low liquidity
  //       rugScore += 15000;
  //       console.log("log >>>>>>>>>>> low liquidity.");
  //     }
  //   }
  //   //check if liquidiity is burned (locked)
  //   if (!rugCheckResult.liquidity.isLiquidityLocked) {
  //     rugScore += 4000;
  //     console.log("log >>>>>>>>>>> liquidiity is locked");
  //   }
  //   for (const holder of rugCheckResult.holders.topHolders) {
  //     if (holder.percentage >= 90) {
  //       //check if single holder ownership > 90%
  //       rugScore += 7000;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 90%.");
  //     } else if (holder.percentage >= 80) {
  //       rugScore += 6000;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 80%.");
  //     } else if (holder.percentage >= 70) {
  //       rugScore += 4600;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 70%.");
  //     } else if (holder.percentage >= 60) {
  //       rugScore += 4400;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 60%.");
  //     } else if (holder.percentage >= 50) {
  //       rugScore += 4300;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 50%.");
  //     } else if (holder.percentage >= 40) {
  //       rugScore += 4100;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 40%.");
  //     } else if (holder.percentage >= 30) {
  //       rugScore += 3500;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 30%.");
  //     } else if (holder.percentage >= 20) {
  //       rugScore += 2500;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 20%.");
  //     } else if (holder.percentage >= 10) {
  //       rugScore += 2000;
  //       console.log("log >>>>>>>>>>> single holder ownership >= 10%.");
  //     }
  //   }

  //   return rugScore;
  // }


  // isRug(rugCheckResult: RugCheckResult): number {
  //   const rugScore = this.rugScore(rugCheckResult);
  //   console.log("log>>>>>>>>>>>>>score:", rugScore, rugScore / Number(process.env.MAX_SCORE) * 10);
  //   return Math.min(Math.round((rugScore / Number(process.env.MAX_SCORE)) * 10), 10);
  // }
}

export { MetadataChecker };
export { HoldersChecker };
export { LiquidityChecker };
export { MarketdataChecker };

export { RugCheckConfig };
export { MetadataCheckConfig };
export { LiquidityCheckConfig };
export { HoldersCheckConfig };
export { MarketdataCheckConfig };