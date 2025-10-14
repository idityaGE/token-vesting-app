use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    #[max_len(100)]
    pub company_name: String,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub treasury_token_account: Pubkey,
    pub token_amount: u64,
    pub treasury_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount {
    pub beneficiary: Pubkey,
    pub vesting_account: Pubkey,
    pub total_amount: u64,
    pub total_withdrawn: u64,
    pub start_time: i64,
    pub cliff_time: i64, // time when token allocation starts
    pub end_time: i64,
    pub revoked: bool,
    pub bump: u8,
}