'use client'

import { getVestingProgram, getVestingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as anchor from '@coral-xyz/anchor'

interface CreateVestingArgs {
  companyName: string,
  mint: string,
}
interface CreateEmployeeArgs {
  tokenAmount: number,
  startTime: number,
  cliffTime: number,
  endTime: number,
  beneficiary: string,
}

export function useVestingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getVestingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVestingProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['vesting', 'all', { cluster }],
    queryFn: () => program.account.vestingAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createVestingAccount = useMutation<string, Error, CreateVestingArgs>({
    mutationKey: ['vesting', 'initialize', { cluster }],
    mutationFn: ({ companyName, mint }) =>
      program.methods
        .initVesting(companyName)
        .accounts({
          mint: new PublicKey(mint),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([])
        .rpc({ commitment: 'confirmed', skipPreflight: true }),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize vesting account')
    },
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createVestingAccount
  }
}

export function useVestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useVestingProgram()

  const vestingAccountQuery = useQuery({
    queryKey: ['vesting', 'fetch', { cluster, account }],
    queryFn: () => program.account.vestingAccount.fetch(account),
  })

  const employeeAccountsQuery = useQuery({
    queryKey: ['vesting', 'employees', { cluster, account }],
    queryFn: () => program.account.employeeAccount.all()
  })


  const createEmployeeAccount = useMutation<string, Error, CreateEmployeeArgs>({
    mutationKey: ['vesting', 'create-employee', { cluster, account }],
    mutationFn: ({ tokenAmount, startTime, endTime, cliffTime, beneficiary }) =>
      program.methods
        .addEmployee(
          new anchor.BN(tokenAmount),
          new anchor.BN(startTime),
          new anchor.BN(cliffTime),
          new anchor.BN(endTime)
        )
        .accounts({
          beneficiary: new PublicKey(beneficiary),
          vestingAccount: account
        })
        .rpc({ commitment: 'confirmed', skipPreflight: true }),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await vestingAccountQuery.refetch()
      await employeeAccountsQuery.refetch()
    },
    onError: () => {
      toast.error('Failed to create employee account')
    },
  })

  const revokeEmployeeAccount = useMutation<string, Error, { beneficiary: string, companyName: string }>({
    mutationKey: ['vesting', 'revoke-employee', { cluster, account }],
    mutationFn: ({ beneficiary, companyName }) =>
      program.methods
        .revokeEmployee(companyName)
        .accounts({
          beneficiary: new PublicKey(beneficiary),
          owner: account
        })
        .rpc({ commitment: 'confirmed', skipPreflight: true }),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await vestingAccountQuery.refetch()
      await employeeAccountsQuery.refetch()
    },
    onError: () => {
      toast.error('Failed to revoke employee account')
    },
  })

  return {
    vestingAccountQuery,
    employeeAccountsQuery,
    createEmployeeAccount,
    revokeEmployeeAccount
  }
}
