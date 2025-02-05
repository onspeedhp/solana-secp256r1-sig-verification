import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Contract } from '../target/types/contract';
import ECDSA from 'ecdsa-secp256r1';
import { createSecp256r1Instruction } from './util';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import {
  createMint,
  createTransferCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
dotenv.config();

describe('contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Contract as Program<Contract>;

  const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;

  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  it('Init smart-wallet', async () => {
    const privateKey = ECDSA.generateKey();

    const publicKeyBase64 = privateKey.toCompressedPublicKey();
    const pubkey = Array.from(Buffer.from(publicKeyBase64, 'base64'));
    const tx = await program.methods
      .initSmartWallet(pubkey)
      .accounts({
        signer: wallet.publicKey,
      })
      .rpc();

    console.log('Init smart-wallet', tx);
  });

  it('Verify and execute transfer token instruction', async () => {
    const [smartWalletPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('smart_wallet'),
        new anchor.BN(0).toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
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
      smartWalletPda,
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
      smartWalletPda,
      10 * 10 ** 6,
      6
    );

    const privateKey = ECDSA.generateKey();

    const message = 'Hello';

    const messageBytes = Buffer.from(message);

    const publicKeyBase64 = privateKey.toCompressedPublicKey();
    const pubkey = Buffer.from(publicKeyBase64, 'base64');

    const signatureBase64 = privateKey.sign(Buffer.from(message).toString());
    let signature = Buffer.from(signatureBase64, 'base64');

    const instructionData = createSecp256r1Instruction(
      messageBytes,
      pubkey,
      signature
    );

    // find signer and set isSigner to false
    let remainingAccounts = transferTokenInstruction.keys.map((key) => {
      return {
        pubkey: key.pubkey,
        isSigner: false,
        isWritable: key.isWritable,
      };
    });

    remainingAccounts.push({
      pubkey: transferTokenInstruction.programId,
      isSigner: false,
      isWritable: false,
    });

    const tx = new Transaction().add(instructionData).add(
      await program.methods
        .verifyAndExecuteInstruction(
          Array.from(pubkey),
          messageBytes,
          Array.from(signature),
          transferTokenInstruction.programId,
          transferTokenInstruction.data
        )
        .accounts({
          signer: wallet.publicKey,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
    );

    tx.recentBlockhash = (
      await anchorProvider.connection.getLatestBlockhash()
    ).blockhash;

    tx.feePayer = wallet.publicKey;

    tx.partialSign(wallet);

    const sig = await anchorProvider.connection.sendTransaction(tx, [wallet], {
      skipPreflight: true,
    });

    console.log(sig);
  });
});
