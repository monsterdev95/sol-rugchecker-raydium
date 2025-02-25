import { Connection, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { Helius } from 'helius-sdk';
import axios from 'axios';
import MetadataCheckConfig from '../model/config/metadata-check';
import MetadataCheckResult from '../model/result/metadata-check';
import { isValidUrl } from '../utils/helper';
import validator from 'validator';

export default class MetadataChecker {
  private connection: Connection;
  private metaplex: Metaplex;
  private heliusApiKey: string;

  constructor({ solanaRpcEndpoint, heliusApiKey }: MetadataCheckConfig, connection?: Connection, metaplex?: Metaplex) {
    if (!solanaRpcEndpoint) {
      solanaRpcEndpoint = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
    }
    if (!connection) {
      connection = new Connection(solanaRpcEndpoint);
    }
    this.connection = connection;
    if (!metaplex) {
      metaplex = Metaplex.make(this.connection);
    }
    this.metaplex = metaplex;
    if (heliusApiKey) {
      this.heliusApiKey = heliusApiKey;
    }
  }

  async check(tokenAddress: string): Promise<MetadataCheckResult> {
    const mintAddress = new PublicKey(tokenAddress);
    const tokenMetadata = await this.metaplex.nfts().findByMint({ mintAddress: mintAddress });
    if (tokenMetadata) {
      // console.log("log>> token metadata", tokenMetadata)
      let metadataCheckResult = this.createRugCheckResult(tokenMetadata);
      let isValid = this.validateMetadata(tokenMetadata);
      // console.log("isMetadata", isMetadata);
      if (
        tokenMetadata.json?.createdOn !== 'https://pump.fun' &&
        this.heliusApiKey &&
        (tokenMetadata.json?.twitter !== '' ||
          tokenMetadata.json?.website !== '' ||
          tokenMetadata.json?.telegram !== '')
      ) {
        metadataCheckResult = await this.getHeliusMetadata(tokenAddress, metadataCheckResult);
      }
      metadataCheckResult.address = tokenAddress;
      metadataCheckResult.isValid = isValid;
      return metadataCheckResult;
    }

    return new MetadataCheckResult();
  }

  private createRugCheckResult(tokenMetadata: any): MetadataCheckResult {
    const metadataCheckResult = new MetadataCheckResult();
    metadataCheckResult.name = tokenMetadata.name;
    metadataCheckResult.description = String(tokenMetadata.json?.description);
    metadataCheckResult.symbol = tokenMetadata.symbol;
    metadataCheckResult.imageUrl = String(tokenMetadata.json?.image);
    metadataCheckResult.telegram = (tokenMetadata.json?.telegram && tokenMetadata.json?.telegram !== 'undefined') ? String(tokenMetadata.json?.telegram) : '';
    metadataCheckResult.twitter = (tokenMetadata.json?.twitter && tokenMetadata.json?.twitter !== 'undefined') ? String(tokenMetadata.json?.twitter) : '';
    metadataCheckResult.website = (tokenMetadata.json?.website && tokenMetadata.json?.website !== 'undefined') ? String(tokenMetadata.json?.website) : '';
    metadataCheckResult.isMutable = tokenMetadata.isMutable;
    metadataCheckResult.isMintable = tokenMetadata.mint.mintAuthorityAddress !== null;
    metadataCheckResult.isFreezable = tokenMetadata.mint.freezeAuthorityAddress !== null;
    metadataCheckResult.isPumpFun = tokenMetadata.json?.createdOn === 'https://pump.fun';
    return metadataCheckResult;
  }

  async getHeliusMetadata(tokenAddress: string, token: MetadataCheckResult) {
    const helius = new Helius(this.heliusApiKey);
    try {
      const response = await helius.rpc.getAsset({
        id: tokenAddress
      });
      const jsonUri = response.content?.json_uri;
      if (jsonUri) {
        const metadataResponse = await axios.get(jsonUri, { timeout: 300000, responseType: 'json' });
        // console.log("metadataResponse", metadataResponse.data);
        if (metadataResponse.data?.extensions?.website) {
          const website = metadataResponse.data?.extensions?.website;
          if (website) {
            const isValidUrl = validator.isURL(website);
            if (isValidUrl) {
              token.website = website;
            }
          }
        }
        if (metadataResponse.data?.extensions?.twitter) {
          const twitter = metadataResponse.data.extensions.twitter;
          if (twitter) {
            token.twitter = twitter;
          }
        }
        if (metadataResponse.data?.extensions?.telegram) {
          const telegram = metadataResponse.data.extensions.telegram;
          if (telegram) {
            token.telegram = telegram;
          }
        }
      }
    } catch (error) {
      console.error('Metadata could not be fetched. Error Status: ', error.status);
    }
    return token;
  }

  private validateMetadata(metadata: any): boolean {
    const requiredFields = ['name', 'symbol', 'uri'];

    //check for required fields
    for (const field of requiredFields) {
      if (!metadata.hasOwnProperty(field)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    //additional checks for required fields
    if (typeof metadata.name !== 'string' || metadata.name.trim() === '') {
      console.error('Invalid name field');
      return false;
    }

    if (typeof metadata.symbol !== 'string' || metadata.symbol.trim() === '') {
      console.error('Invalid symbol field');
      return false;
    }

    if (typeof metadata.uri !== 'string' || !isValidUrl(metadata.uri)) {
      console.error('Invalid URI field');
      return false;
    }

    //Optional field checks: sellerFeeBasisPoints
    if (metadata.hasOwnProperty('sellerFeeBasisPoints')) {
      if (typeof metadata.sellerFeeBasisPoints !== 'number' || metadata.sellerFeeBasisPoints < 0 || metadata.sellerFeeBasisPoints > 10000) {
        console.error('Invalid sellerFeeBasisPoints field: Must be a number between 0 and 10000');
        return false;
      }
    }

    //Optional field checks: creators
    if (metadata.hasOwnProperty('creators')) {
      if (!Array.isArray(metadata.creators)) {
        console.error('Invalid creators field: Must be an array');
        return false;
      }

      for (const creator of metadata.creators) {
        if (typeof creator !== 'object' || !creator.hasOwnProperty('address') || !creator.hasOwnProperty('share')) {
          console.error('Invalid creator format: Each creator must be an object with "address" and "share" properties');
          return false;
        }

        if (creator.verified !== true) {
          console.error('no verified');
          return false;
        }

        if (typeof creator.share !== 'number' || creator.share < 0 || creator.share > 100) {
          console.error('Invalid creator share format: share property must be number between 0 and 100');
          return false;
        }
      }
    }

    // If all checks pass
    console.log('Metadata is valid');
    return true;
  }

}
