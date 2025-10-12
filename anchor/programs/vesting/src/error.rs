use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Claim not available before cliff time")]
    ClaimNotAvailable,
    #[msg("No Claimable amount is available")]
    NothingToClaim,
    #[msg("Invalid vesting duration")]
    InvalidVestingDuration,
    #[msg("Overflow occurred during calculation")]
    CalculationOverflow,
    #[msg("Underflow occurred during calculation")]
    CalculationUnderflow,
    #[msg("Employee has been revoked")]
    EmployeeRevoked,
}
