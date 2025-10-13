import {
  PublicKey,
  SystemProgram,
  Connection
} from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"
import { ProgramTestContext, startAnchor, BanksClient } from "solana-bankrun"
import { BankrunProvider } from "anchor-bankrun"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { createMint, mintTo } from "spl-token-bankrun";

import VestingIDL from "../target/idl/vesting.json"
import { Vesting } from "../target/types/vesting"

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet"

describe("Vesting Program Tests", () => {
  let company_name = "MyCompany"
  let beneficiary: anchor.web3.Keypair
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
    beneficiary = new anchor.web3.Keypair()
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
    
  })

})