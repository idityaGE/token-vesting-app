#![allow(clippy::result_large_err, unexpected_cfgs)]

pub mod error;
pub mod state;

use crate::error::ErrorCode;
use crate::state::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe");

#[program]
pub mod vesting {
    use super::*;

    pub fn init_vesting(ctx: Context<InitVesting>, company_name: String) -> Result<()> {
        *ctx.accounts.vesting_account = VestingAccount {
            company_name: company_name.clone(),
            owner: ctx.accounts.signer.key(),
            mint: ctx.accounts.mint.key(),
            treasury_token_account: ctx.accounts.treasury_token_account.key(),
            token_amount: 0,
            treasury_bump: ctx.bumps.treasury_token_account,
            bump: ctx.bumps.vesting_account,
        };

        msg!(
            "Vesting account initialized: {} for company {}",
            ctx.accounts.vesting_account.key(),
            company_name
        );

        Ok(())
    }

    pub fn add_employee(
        ctx: Context<AddEmployee>,
        total_amount: u64,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
    ) -> Result<()> {
        *ctx.accounts.employee_account = EmployeeAccount {
            beneficiary: ctx.accounts.beneficiary.key(),
            vesting_account: ctx.accounts.vesting_account.key(),
            total_amount,
            total_withdrawn: 0,
            start_time,
            cliff_time,
            end_time,
            revoked: false,
            bump: ctx.bumps.employee_account,
        };

        msg!(
            "Employee account initialized: {} for beneficiary {}",
            ctx.accounts.employee_account.key(),
            ctx.accounts.beneficiary.key()
        );

        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>, _company_name: String) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_account;
        let now = Clock::get()?.unix_timestamp;

        require!(!employee_account.revoked, ErrorCode::EmployeeRevoked);

        if now < employee_account.cliff_time {
            return Err(ErrorCode::ClaimNotAvailable.into());
        }

        let time_since_start = now.saturating_sub(employee_account.start_time);
        let total_vesting_duration = employee_account
            .end_time
            .saturating_sub(employee_account.start_time);

        if total_vesting_duration <= 0 {
            return Err(ErrorCode::InvalidVestingDuration.into());
        }

        let vested_amount = if now >= employee_account.end_time {
            employee_account.total_amount
        } else {
            (employee_account.total_amount as u128)
                .checked_mul(time_since_start as u128)
                .ok_or(ErrorCode::CalculationOverflow)?
                .checked_div(total_vesting_duration as u128)
                .ok_or(ErrorCode::CalculationUnderflow)? as u64
        };

        let claimable_amount = vested_amount.saturating_sub(employee_account.total_withdrawn);

        if claimable_amount == 0 {
            return Err(ErrorCode::NothingToClaim.into());
        }

        let transfer_cpi_accounts = TransferChecked {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.employee_token_account.to_account_info(),
            authority: ctx.accounts.treasury_token_account.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vesting_treasury",
            ctx.accounts.vesting_account.company_name.as_ref(),
            &[ctx.accounts.vesting_account.treasury_bump],
        ]];

        let cpi_context =
            CpiContext::new(cpi_program, transfer_cpi_accounts).with_signer(signer_seeds);

        let decimals = ctx.accounts.mint.decimals;

        token_interface::transfer_checked(cpi_context, claimable_amount, decimals)?;

        employee_account.total_withdrawn += claimable_amount;

        msg!(
            "Employee {} claimed {} tokens",
            ctx.accounts.beneficiary.key(),
            claimable_amount
        );

        Ok(())
    }

    pub fn revoke_employee(ctx: Context<RevokeEmployee>, _company_name: String) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_account;
        employee_account.revoked = true;

        msg!(
            "Employee {} has been revoked by owner {}",
            ctx.accounts.beneficiary.key(),
            ctx.accounts.owner.key()
        );

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct InitVesting<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = VestingAccount::DISCRIMINATOR.len() + VestingAccount::INIT_SPACE,
        seeds = [company_name.as_ref()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = treasury_token_account,
        seeds = [b"vesting_treasury".as_ref(), company_name.as_bytes()],
        bump
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct AddEmployee<'info> {
    #[account(mut)]
    pub owner: Signer<'info>, // Employer who owns the vesting account

    pub beneficiary: SystemAccount<'info>,

    #[account(has_one = owner)]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        space = EmployeeAccount::DISCRIMINATOR.len() + EmployeeAccount::INIT_SPACE,
        payer = owner,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,

    #[account(
        mut,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump,
        has_one = beneficiary,
        has_one = vesting_account,
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    #[account(
        mut,
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = treasury_token_account,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program,
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct RevokeEmployee<'info> {
    pub owner: Signer<'info>,
    pub beneficiary: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    #[account(
        seeds = [company_name.as_ref()],
        bump = vesting_account.bump,
        has_one = treasury_token_account,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
}
