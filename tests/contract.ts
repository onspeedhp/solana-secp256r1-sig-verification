import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Contract } from '../target/types/contract';
import ECDSA from 'ecdsa-secp256r1';
import { Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import {
  createMint,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { createInitSmartWalletTransaction } from '../script/api/init';
import { getSmartWalletPdaByCreator } from '../script/api/getSmartWalletPda';
import { createVerifyAndExecuteTransaction } from '../script/api/verifyAndExecute';
dotenv.config();

describe('contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;

  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  xit('Init smart-wallet', async () => {
    const privateKey = ECDSA.generateKey();

    const publicKeyBase64 = privateKey.toCompressedPublicKey();

    const pubkey = Array.from(Buffer.from(publicKeyBase64, 'base64'));

    const txn = await createInitSmartWalletTransaction({
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
      await createInitSmartWalletTransaction({
        secp256k1PubkeyBytes: Array.from(pubkey),
        connection: anchorProvider.connection,
        payer: wallet.publicKey,
      }),
      [wallet]
    );

    const smartWalletPubkey = await getSmartWalletPdaByCreator(
      anchorProvider.connection,
      Array.from(pubkey)
    );

    /// create mint
    const mint = await createMint(
      anchorProvider.connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      6
    );

    // create ata for smart wallet
    const smartWalletAta = await getOrCreateAssociatedTokenAccount(
      anchorProvider.connection,
      wallet,
      mint,
      smartWalletPubkey,
      true
    );

    // mint to smart wallet
    mintTo(
      anchorProvider.connection,
      wallet,
      mint,
      smartWalletAta.address,
      wallet.publicKey,
      10 * 10 ** 6
    );

    // create ata for wallet
    const walletAta = await getOrCreateAssociatedTokenAccount(
      anchorProvider.connection,
      wallet,
      mint,
      wallet.publicKey,
      false
    );

    const transferTokenInstruction = createTransferCheckedInstruction(
      smartWalletAta.address,
      mint,
      walletAta.address,
      smartWalletPubkey,
      10 * 10 ** 6,
      6
    );

    const message = 'Hello';

    const messageBytes = Buffer.from(message);

    const signatureBase64 = privateKey.sign(Buffer.from(message).toString());

    let signature = Buffer.from(signatureBase64, 'base64');

    const txn = await createVerifyAndExecuteTransaction({
      arbitraryInstruction: transferTokenInstruction,
      pubkey: pubkey,
      signature: signature,
      message: messageBytes,
      connection: anchorProvider.connection,
      payer: wallet.publicKey,
      smartWalletPda: smartWalletPubkey,
    });

    const sig = await anchorProvider.sendAndConfirm(txn, [wallet], {
      skipPreflight: true,
    });

    console.log('Verify and execute transfer token instruction', sig);
  });
});
