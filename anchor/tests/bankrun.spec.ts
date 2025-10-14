import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"
import { ProgramTestContext, startAnchor, BanksClient, Clock } from "solana-bankrun"
import { BankrunProvider } from "anchor-bankrun"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { createMint, mintTo } from "spl-token-bankrun";

import VestingIDL from "../target/idl/vesting.json"
import { Vesting } from "../target/types/vesting"

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet"

describe("Vesting Program Tests", () => {
  let company_name = "MyCompany"
  let beneficiary: anchor.web3.Keypair = new anchor.web3.Keypair()
  let context: ProgramTestContext
  let provider: BankrunProvider
  let program: anchor.Program<Vesting>
  let banksClient: BanksClient
  let employer: anchor.web3.Keypair
  let mint: PublicKey
  let beneficiaryProvider: BankrunProvider
  let program2: anchor.Program<Vesting>
  let vestingAccountKey: PublicKey
  let treasuryTokenAccount: PublicKey
  let employeeAccount: PublicKey


  beforeAll(async () => {
    context = await startAnchor(
      "",
      [{ name: "vesting", programId: new PublicKey(VestingIDL.address) }],
      [
        {
          address: beneficiary.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: Buffer.alloc(0),
            owner: SystemProgram.programId,
            executable: false
          }
        }
      ]
    )
    provider = new BankrunProvider(context)
    anchor.setProvider(provider)
    program = new anchor.Program<Vesting>(VestingIDL as Vesting, provider)
    banksClient = context.banksClient
    employer = provider.wallet.payer

    mint = await createMint(
      //@ts-ignore
      banksClient,
      employer,
      employer.publicKey,
      null,
      2
    )

    beneficiaryProvider = new BankrunProvider(context)
    beneficiaryProvider.wallet = new NodeWallet(beneficiary)

    program2 = new anchor.Program<Vesting>(VestingIDL as Vesting, beneficiaryProvider);

    [vestingAccountKey] = PublicKey.findProgramAddressSync(
      [Buffer.from(company_name)],
      program.programId
    );

    [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vesting_treasury"), Buffer.from(company_name)],
      program.programId
    );

    [employeeAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("employee_vesting"),
        beneficiary.publicKey.toBuffer(),
        vestingAccountKey.toBuffer()
      ],
      program.programId
    )

  })

  it("Initialize Vesting Account", async () => {
    const tx = await program.methods.initVesting(company_name)
      .accounts({
        mint: mint,
        signer: employer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([employer])
      .rpc({ commitment: 'confirmed' })

    console.log("Your transaction signature", tx);
    const vestingAccountData = await program.account.vestingAccount.fetch(vestingAccountKey, 'confirmed')
    console.log("Vesting Account Data:", vestingAccountData)
  })

  it("Fund Vesting Treasury", async () => {
    const amount = 10_000 * 10 ** 2;
    const tx = await mintTo(
      //@ts-ignore
      banksClient,
      employer,
      mint,
      treasuryTokenAccount,
      employer,
      amount
    )
    console.log("Mint Treasury Token Account is Funded : ", tx.logMessages);
  })

  it("Add Employee", async () => {
    let start_time = new anchor.BN(0);
    let end_time = new anchor.BN(100);
    let cliff_time = new anchor.BN(0);
    let amount = new anchor.BN(100);

    const tx = await program.methods.addEmployee(
      amount,
      start_time,
      cliff_time,
      end_time
    )
      .accounts({
        beneficiary: beneficiary.publicKey,
        vestingAccount: vestingAccountKey
      })
      .rpc({ commitment: 'confirmed', skipPreflight: true })

    console.log("Add Employee Transaction: ", tx);
    const employeeVestingData = await program.account.employeeAccount.fetch(employeeAccount, 'confirmed')
    console.log("Employee Vesting Data: ", employeeVestingData);
  })

  it("Cliam Offer", async () => {
    await new Promise((res) => setTimeout(res, 1000))
    const currentClock = await banksClient.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        1000n
      )
    )

    let tx = await program2.methods.claimTokens(company_name)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc({ commitment: "confirmed" })

    console.log("Claim Transaction: ", tx);
  })

  it("Revoke Employee", async () => {
    const tx = await program.methods.revokeEmployee(company_name)
      .accounts({
        beneficiary: beneficiary.publicKey,
        owner: employer.publicKey
      })
      .signers([employer])
      .rpc({ commitment: "confirmed" })

    console.log("Account Revoked for beneficiary : ", beneficiary.publicKey.toBase58());

    const employeeVestingData = await program.account.employeeAccount.fetch(employeeAccount, 'confirmed')
    console.log("Revoked Employed Account Details :", employeeVestingData);
  })


})