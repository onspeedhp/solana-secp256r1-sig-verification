import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Contract } from '../target/types/contract';
import ECDSA from 'ecdsa-secp256r1';
import { createSecp256r1Instruction } from './util';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
dotenv.config();

describe('contract', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Contract as Program<Contract>;

  const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;

  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  it('Is initialized!', async () => {
    const privateKey = ECDSA.generateKey();

    const message = 'Hello';

    const messageBytes = Buffer.from(message);

    const publicKeyBase64 = privateKey.toCompressedPublicKey();
    const pubkey = Buffer.from(publicKeyBase64, 'base64');

    const signatureBase64 = privateKey.sign(Buffer.from(message).toString());
    let signature = Buffer.from(signatureBase64, 'base64');

    const instructionData = createSecp256r1Instruction(
      privateKey,
      messageBytes,
      pubkey
    );

    const transferSOLInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000000,
    });

    const remainingAccounts = transferSOLInstruction.keys;

    remainingAccounts.push({
      pubkey: transferSOLInstruction.programId,
      isSigner: false,
      isWritable: false,
    });

    const tx = new Transaction().add(instructionData).add(
      await program.methods
        .verifySecpr1(
          Array.from(pubkey),
          messageBytes,
          Array.from(signature),
          transferSOLInstruction.programId,
          transferSOLInstruction.data
        )
        .accounts({
          sender: wallet.publicKey,
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
