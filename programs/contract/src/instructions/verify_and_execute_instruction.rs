use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;

use crate::util::verify_secp256r1_ix;
use crate::ID;
use anchor_lang::solana_program::sysvar::instructions::ID as IX_ID;
use anchor_lang::solana_program::{
    instruction::Instruction, sysvar::instructions::load_instruction_at_checked,
};

pub fn verify_and_execute_instruction<'info>(
    ctx: Context<Verify>,
    pubkey: [u8; 33],
    msg: Vec<u8>,
    sig: [u8; 64],
    program_id: Pubkey,
    data: Vec<u8>,
) -> Result<()> {
    // Get what should be the Secp256k1Program instruction
    let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

    // Check that ix is what we expect to have been sent
    verify_secp256r1_ix(&ix, &pubkey, &msg, &sig)?;

    let seeds: &[&[u8]] = &[b"smart_wallet"];

    let (smart_wallet_pda, bump) = Pubkey::find_program_address(&seeds, &ID);

    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);

    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| AccountMeta {
            pubkey: *acc.key,
            is_signer: *acc.key == smart_wallet_pda, // check if pubkey equal smart_wallet_pda
            is_writable: acc.is_writable,
        })
        .collect();

    // Create instruction
    let instruction = Instruction {
        program_id,
        accounts,
        data,
    };

    // Execute the instruction
    invoke_signed(&instruction, &ctx.remaining_accounts, &[seeds_signer])?;

    Ok(())
}

#[derive(Accounts)]
pub struct Verify<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}
