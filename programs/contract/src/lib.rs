use anchor_lang::prelude::*;
pub mod error;
use anchor_lang::solana_program::sysvar::instructions::ID as IX_ID;

pub mod util;
pub use util::*;

declare_id!("3jq9oBWGCUWmBynC8TTBL9KWJdGegsChJ1c8ksybGhum");

#[program]
pub mod contract {
    use anchor_lang::solana_program::{
        instruction::Instruction, program::invoke,
        sysvar::instructions::load_instruction_at_checked,
    };

    use super::*;

    pub fn verify_secpr1<'info>(
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
        util::verify_secp256r1_ix(&ix, &pubkey, &msg, &sig)?;

        let accounts: Vec<AccountMeta> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
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
        invoke(&instruction, &ctx.remaining_accounts)?;

        Ok(())
    }
}

/// Context accounts
#[derive(Accounts)]
pub struct Verify<'info> {
    pub sender: Signer<'info>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}
