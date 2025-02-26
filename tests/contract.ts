import * as anchor from '@coral-xyz/anchor';
import ECDSA from 'ecdsa-secp256r1';
import { Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';

import { setup } from './raydium-swap/swap';
import { SmartWalletContract } from '../sdk';
dotenv.config();

describe('contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;

  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  const program = new SmartWalletContract(anchorProvider.connection);

  xit('Init smart-wallet', async () => {
    const privateKey = ECDSA.generateKey();

    const publicKeyBase64 = privateKey.toCompressedPublicKey();

    const pubkey = Array.from(Buffer.from(publicKeyBase64, 'base64'));

    const txn = await program.createInitSmartWalletTransaction({
      secp256k1PubkeyBytes: pubkey,
      connection: anchorProvider.connection,
      payer: wallet.publicKey,
    });

    const sig = await anchorProvider.sendAndConfirm(txn, [wallet]);

    console.log('Init smart-wallet', sig);
  });

  it('Verify and execute transfer token instruction', async () => {
    // create smart wallet
    const privateKey = ECDSA.generateKey();
    const publicKeyBase64 = privateKey.toCompressedPublicKey();
    const pubkey = Buffer.from(publicKeyBase64, 'base64');

    await anchorProvider.sendAndConfirm(
      await program.createInitSmartWalletTransaction({
        secp256k1PubkeyBytes: Array.from(pubkey),
        connection: anchorProvider.connection,
        payer: wallet.publicKey,
      }),
      [wallet]
    );

    const smartWalletPubkey = await program.getSmartWalletPdaByCreator(
      Array.from(pubkey)
    );

    console.log('Smart wallet pubkey', smartWalletPubkey.toBase58());

    const swapIns = await setup({
      smartWalletPubkey,
      wallet,
      anchorProvider,
    });

    const { message, messageBytes } = await program.getMessage(
      smartWalletPubkey
    );

    const signatureBase64 = privateKey.sign(messageBytes.toString());

    let signature = Buffer.from(signatureBase64, 'base64');

    const txn = await program.createVerifyAndExecuteTransaction({
      arbitraryInstruction: swapIns,
      pubkey: pubkey,
      signature: signature,
      message,
      connection: anchorProvider.connection,
      payer: wallet.publicKey,
      smartWalletPda: smartWalletPubkey,
    });

    txn.partialSign(wallet);

    const sig = await anchorProvider.connection.sendRawTransaction(
      txn.serialize()
    );

    console.log('Verify and execute transfer token instruction', sig);
  });
});
