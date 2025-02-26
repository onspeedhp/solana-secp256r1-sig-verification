import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { Contract } from '../target/types/contract';
import IDL from '../target/idl/contract.json';
import * as anchor from '@coral-xyz/anchor';
import {
  CreateInitSmartWalletTransactionParam,
  CreateVerifyAndExecuteTransactionParams,
  Message,
} from './types';
import { createSecp256r1Instruction, getID } from './utils';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

export class SmartWalletContract {
  constructor(private readonly connection: Connection) {}

  get program(): anchor.Program<Contract> {
    return new anchor.Program(IDL as Contract, {
      connection: this.connection,
    });
  }

  async getMessage(smartWalletPda: PublicKey): Promise<{
    message: {
      nonce: anchor.BN;
      timestamp: anchor.BN;
    };
    messageBytes: Buffer<ArrayBufferLike>;
  }> {
    const smartWalletData = await this.program.account.smartWallet.fetch(
      smartWalletPda
    );

    const message: Message = {
      timestamp: new anchor.BN(Math.floor(Date.now() / 1000)),
      nonce: smartWalletData.nonce,
    };

    return {
      message,
      messageBytes: this.program.coder.types.encode('message', message),
    };
  }

  async createVerifyAndExecuteTransaction(
    params: CreateVerifyAndExecuteTransactionParams
  ): Promise<Transaction> {
    const {
      arbitraryInstruction,
      pubkey,
      signature,
      message,
      connection,
      payer,
      smartWalletPda,
    } = params;

    const program = new anchor.Program(IDL as Contract, {
      connection: connection,
    });

    // find signer and set isSigner to false
    let remainingAccounts = arbitraryInstruction.keys.map((key) => {
      return {
        pubkey: key.pubkey,
        isSigner: false,
        isWritable: key.isWritable,
      };
    });

    const messageBytes = this.program.coder.types.encode('message', message);

    const verifySecp256r1Instruction = createSecp256r1Instruction(
      messageBytes,
      pubkey,
      signature
    );

    const txn = new Transaction()
      .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }))
      .add(verifySecp256r1Instruction)
      .add(
        await program.methods
          .verifyAndExecuteInstruction(
            Array.from(pubkey),
            message,
            Array.from(signature),
            arbitraryInstruction.data
          )
          .accounts({
            smartWallet: smartWalletPda,
            cpiProgram: arbitraryInstruction.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction()
      );

    txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    txn.feePayer = payer;

    return txn;
  }

  async createInitSmartWalletTransaction(
    param: CreateInitSmartWalletTransactionParam
  ): Promise<Transaction> {
    const { secp256k1PubkeyBytes, connection, payer } = param;

    // check pubkey length
    if (secp256k1PubkeyBytes.length !== 33) {
      throw new Error('Invalid pubkey length');
    }

    const program = new anchor.Program(IDL as Contract, {
      connection: connection,
    });

    const id = new anchor.BN(getID());

    const createSmartWalletIns = await program.methods
      .initSmartWallet(secp256k1PubkeyBytes, id)
      .accounts({
        signer: payer,
      })
      .instruction();

    const txn = new Transaction().add(createSmartWalletIns);

    txn.feePayer = payer;
    txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    return txn;
  }

  async getSmartWalletPdaByCreator(ownerPubkey: number[]): Promise<PublicKey> {
    const accounts = await this.connection.getProgramAccounts(
      this.program.programId,
      {
        dataSlice: {
          offset: 8,
          length: 33,
        },
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: bs58.encode(
                IDL?.accounts.find(
                  (acc: { name: string; discriminator: number[] }) =>
                    acc.name === 'SmartWallet'
                )?.discriminator as number[]
              ),
            },
          },
          {
            memcmp: {
              offset: 8,
              bytes: bs58.encode(ownerPubkey),
            },
          },
        ],
      }
    );

    if (accounts.length === 0) {
      throw new Error('Smart wallet not found');
    }

    const account = accounts[0];

    return account.pubkey;
  }
}
