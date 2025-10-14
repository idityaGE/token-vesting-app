import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import VestingIDL from '../target/idl/vesting.json'
import type { Vesting } from '../target/types/vesting'

export { Vesting, VestingIDL }

export const VESTING_PROGRAM_ID = new PublicKey(VestingIDL.address)

export function getVestingProgram(provider: AnchorProvider, address?: PublicKey): Program<Vesting> {
  return new Program({ ...VestingIDL, address: address ? address.toBase58() : VestingIDL.address } as Vesting, provider)
}

export function getVestingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      return new PublicKey('4GBnTiaskZnCW8ngvcmNZJKGQBzN95ZZwBPTSzRJrH8A')
    case 'mainnet-beta':
    default:
      return VESTING_PROGRAM_ID
  }
}
