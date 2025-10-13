import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import { Vesting } from '../target/types/vesting'

describe('vesting', () => {

  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Vesting as Program<Vesting>

  const vestingKeypair = Keypair.generate()

  it('Initialize Vesting', async () => {
    await program.methods.initVesting()
      .accounts({
        mint: "",
        tokenProgram: "",
        signer: "",
      })
      .rpc
  })

})
