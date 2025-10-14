'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVestingProgram, useVestingProgramAccount } from './vesting-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useWallet } from '@solana/wallet-adapter-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, CoinsIcon, UserIcon, AlertTriangleIcon, BuildingIcon } from 'lucide-react'
import { CreateEmployee } from './forms/create-employee'


export function VestingCreate() {
  const { createVestingAccount } = useVestingProgram()
  const [companyName, setCompanyName] = useState("")
  const [mint, setMint] = useState("")

  const isFormValid = companyName.length > 0 && mint.length > 0

  const onSubmit = () => {
    if (!isFormValid) {
      toast.error("Please fill in all fields")
      return
    }
    createVestingAccount.mutateAsync({ companyName, mint })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon className="h-5 w-5" />
          Create Vesting Account
        </CardTitle>
        <CardDescription>
          Set up a new company vesting account to manage employee token distributions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint">Mint Address</Label>
            <Input
              id="mint"
              value={mint}
              onChange={(e) => setMint(e.target.value)}
              placeholder="Enter token mint address"
            />
          </div>
          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={createVestingAccount.isPending || !isFormValid}
          >
            {createVestingAccount.isPending ? 'Creating...' : 'Create Vesting Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram()

  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  if (!getProgramAccount.data?.value) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangleIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Program Account Not Found</h3>
            <p className="text-sm text-muted-foreground">
              Make sure you have deployed the program and are on the correct cluster.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="w-full space-y-6">
      {accounts.isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : accounts.data?.length ? (
        <div className="space-y-6">
          {accounts.data?.map((account) => (
            <VestingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BuildingIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Vesting Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Create your first vesting account above to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


function EmployeeCard({
  employee,
  vestingAccount
}: {
  employee: any,
  vestingAccount: any
}) {
  const { revokeEmployeeAccount } = useVestingProgramAccount({ account: vestingAccount.publicKey })
  const { publicKey } = useWallet()

  const isOwner = publicKey && vestingAccount.account?.owner?.equals(publicKey)

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getVestingStatus = () => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = employee.account.startTime.toNumber()
    const cliffTime = employee.account.cliffTime.toNumber()
    const endTime = employee.account.endTime.toNumber()

    if (employee.account.revoked) return { status: 'Revoked', color: 'destructive' }
    if (now < startTime) return { status: 'Not Started', color: 'secondary' }
    if (now < cliffTime) return { status: 'Cliff Period', color: 'outline' }
    if (now >= endTime) return { status: 'Fully Vested', color: 'default' }
    return { status: 'Vesting', color: 'default' }
  }

  const vestingStatus = getVestingStatus()

  const handleRevoke = () => {
    if (!vestingAccount.account?.companyName) {
      toast.error("Company name not found")
      return
    }

    revokeEmployeeAccount.mutateAsync({
      beneficiary: employee.account.beneficiary.toString(),
      companyName: vestingAccount.account.companyName
    })
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2 mb-1">
              <UserIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Employee</span>
            </CardTitle>
            <CardDescription className="text-xs break-all">
              {ellipsify(employee.account.beneficiary.toString(), 8)}
            </CardDescription>
          </div>
          <Badge variant={vestingStatus.color as any} className="flex-shrink-0">
            {vestingStatus.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CoinsIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Total</p>
            </div>
            <p className="text-sm font-semibold">
              {employee.account.totalAmount.toString()}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CoinsIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium">Withdrawn</p>
            </div>
            <p className="text-sm font-semibold">
              {employee.account.totalWithdrawn.toString()}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Timeline</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start:</span>
              <span className="font-medium">{formatTimestamp(employee.account.startTime.toNumber())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliff:</span>
              <span className="font-medium">{formatTimestamp(employee.account.cliffTime.toNumber())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End:</span>
              <span className="font-medium">{formatTimestamp(employee.account.endTime.toNumber())}</span>
            </div>
          </div>
        </div>

        {employee.account.revoked && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded-md">
              <AlertTriangleIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-medium">Vesting Revoked</span>
            </div>
          </div>
        )}
      </CardContent>
      {isOwner && !employee.account.revoked && (
        <CardContent className="pt-0">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevoke}
            disabled={revokeEmployeeAccount.isPending}
            className="w-full"
          >
            {revokeEmployeeAccount.isPending ? 'Revoking...' : 'Revoke Vesting'}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

function VestingCard({ account }: { account: PublicKey }) {
  const { vestingAccountQuery, employeeAccountsQuery } = useVestingProgramAccount({
    account,
  })

  if (vestingAccountQuery.isLoading) {
    return (
      <Card className="w-full">
        <div className="space-y-4 p-6">
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </Card>
    )
  }

  const vestingData = vestingAccountQuery.data
  const employees = employeeAccountsQuery.data || []

  // Filter employees for this specific vesting account
  const filteredEmployees = employees.filter(
    emp => emp.account.vestingAccount.equals(account)
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl mb-2 flex items-center gap-2">
              <BuildingIcon className="h-6 w-6 flex-shrink-0" />
              <span className="truncate">{vestingData?.companyName || 'Loading...'}</span>
            </CardTitle>
            <CardDescription className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium min-w-[60px]">Owner:</span>
                <span className="text-xs break-all">{ellipsify(vestingData?.owner.toBase58() || '', 8)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium min-w-[60px]">Mint:</span>
                <span className="text-xs break-all">{ellipsify(vestingData?.mint.toBase58() || '', 8)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium min-w-[60px]">Treasury:</span>
                <span className="text-xs break-all">{ellipsify(vestingData?.treasuryTokenAccount.toBase58() || '', 8)}</span>
              </div>
            </CardDescription>
          </div>
          <ExplorerLink path={`account/${account.toString()}`} label="View on Explorer" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CreateEmployee account={account} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Employees
            </h3>
            <Badge variant="secondary">{filteredEmployees.length}</Badge>
          </div>

          {employeeAccountsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee, index) => (
                <EmployeeCard
                  key={employee.publicKey.toString() || index}
                  employee={employee}
                  vestingAccount={{
                    publicKey: account,
                    account: vestingData
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium mb-2">No Employees Yet</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your first employee using the form above to start managing vesting schedules.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
