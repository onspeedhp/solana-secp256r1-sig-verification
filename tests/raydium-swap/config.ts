import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Raydium, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2';

import {
  ENDPOINT as _ENDPOINT,
  Currency,
  Token,
  TOKEN_PROGRAM_ID,
  TxVersion,
} from '@raydium-io/raydium-sdk';

export const OPENBOOK_MARKET = new PublicKey(
  'EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj'
);

export const AMM_PROGRAM_ID = new PublicKey(
  'HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8'
);

export const FEE_DESTINATION = new PublicKey(
  '3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR'
);

export const connection = new Connection('http://127.0.0.1:8899');
// export const connection = new Connection(clusterApiUrl('devnet')) //<YOUR_RPC_URL>
export const txVersion = TxVersion.LEGACY; // or TxVersion.LEGACY
const cluster = 'devnet'; // 'mainnet' | 'devnet'

export const initSdk = async (params?: {
  loadToken?: boolean;
  owner: PublicKey | Keypair;
}) => {
  let raydium: Raydium | undefined;

  if (raydium) return raydium;
  if (connection.rpcEndpoint === clusterApiUrl('mainnet-beta'))
    console.warn(
      'using free rpc node might cause unexpected error, strongly suggest uses paid rpc node'
    );
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`);
  raydium = await Raydium.load({
    owner: params.owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: 'finalized',
    // urlConfigs: {
    //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
    // },
  });

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balace changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */

  /*   */
  //   raydium.account.updateTokenAccount(
  //     await fetchTokenAccountData({ ownerPubkey: owner.publicKey })
  //   );
  // connection.onAccountChange(owner.publicKey, async () => {
  //   raydium!.account.updateTokenAccount(await fetchTokenAccountData());
  // });

  return raydium;
};

export const fetchTokenAccountData = async ({
  ownerPubkey,
}: {
  ownerPubkey: PublicKey;
}) => {
  const solAccountResp = await connection.getAccountInfo(ownerPubkey);
  const tokenAccountResp = await connection.getTokenAccountsByOwner(
    ownerPubkey,
    { programId: TOKEN_PROGRAM_ID }
  );
  const token2022Req = await connection.getTokenAccountsByOwner(ownerPubkey, {
    programId: TOKEN_2022_PROGRAM_ID,
  });
  const tokenAccountData = parseTokenAccountResp({
    owner: ownerPubkey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  });
  return tokenAccountData;
};

export const DEFAULT_TOKEN = {
  SOL: new Currency(9, 'USDC', 'USDC'),
  WSOL: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('So11111111111111111111111111111111111111112'),
    9,
    'WSOL',
    'WSOL'
  ),
  USDC: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('EXXTWGTPfisRWWK7Mm77dTbCuSyVZD4sYabLPJa1mpHV'),
    9,
    'USDC',
    'USDC'
  ),
  RAY: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('89WobZdLQv1CNYH7bJxCHHuV8CBMbVSscvQ6U6RSD7RD'),
    9,
    'RAY',
    'RAY'
  ),
  'RAY_USDC-LP': new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey('9w6mz2a8v71RU4h6cT7EhvViPMHnEgo5FTCFZ8tH5H2A'),
    9,
    'RAY-USDC',
    'RAY-USDC'
  ),
};
