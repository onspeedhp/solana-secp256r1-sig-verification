use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct SmartWallet {
    pub id: u64,

    #[max_len(5)]
    pub pubkey: Vec<[u8; 33]>,
}

pub fn init_smart_wallet(ctx: Context<InitSmartWallet>, pubkey: [u8; 33], id: u64) -> Result<()> {
    let smart_wallet = &mut ctx.accounts.smart_wallet;
    smart_wallet.pubkey = vec![pubkey];
    smart_wallet.id = id;

    Ok(())
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct InitSmartWallet<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed, 
        payer = signer, 
        space = 8 + SmartWallet::INIT_SPACE, 
        seeds = [b"smart_wallet".as_ref(), id.to_le_bytes().as_ref()], 
        bump 
    )]
    pub smart_wallet: Account<'info, SmartWallet>,

    pub system_program: Program<'info, System>,
}
