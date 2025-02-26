import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Contract } from '../target/types/contract';

export type Message = anchor.IdlTypes<Contract>['message'];

export type CreateVerifyAndExecuteTransactionParams = {
  arbitraryInstruction: TransactionInstruction;
  pubkey: Buffer<ArrayBuffer>;
  signature: Buffer<ArrayBuffer>;
  message: Message;
  connection: Connection;
  payer: PublicKey;
  smartWalletPda: PublicKey;
};

export type CreateInitSmartWalletTransactionParam = {
  secp256k1PubkeyBytes: number[];
  connection: Connection;
  payer: PublicKey;
};
