'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useVestingProgramAccount } from '../vesting-data-access'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlusIcon, CalendarIcon, CoinsIcon, WalletIcon } from 'lucide-react'

export function CreateEmployee({ account }: { account: PublicKey }) {
  const { createEmployeeAccount } = useVestingProgramAccount({ account })
  const [tokenAmount, setTokenAmount] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [startTime, setStartTime] = useState('')
  const [cliffTime, setCliffTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const isFormValid =
    tokenAmount &&
    beneficiary &&
    startTime &&
    cliffTime &&
    endTime &&
    !isNaN(Number(tokenAmount)) &&
    Number(tokenAmount) > 0 &&
    !isNaN(Number(startTime)) &&
    !isNaN(Number(cliffTime)) &&
    !isNaN(Number(endTime)) &&
    Number(startTime) < Number(cliffTime) &&
    Number(cliffTime) < Number(endTime)

  const onSubmit = () => {
    if (!isFormValid) {
      toast.error("Please fill in all fields with valid values")
      return
    }

    createEmployeeAccount.mutateAsync({
      tokenAmount: Number(tokenAmount),
      beneficiary,
      startTime: Number(startTime),
      cliffTime: Number(cliffTime),
      endTime: Number(endTime),
    })
  }

  // Helper to get current timestamp
  const getCurrentTimestamp = () => Math.floor(Date.now() / 1000)

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlusIcon className="h-5 w-5" />
          Add New Employee
        </CardTitle>
        <CardDescription>
          Create a new vesting schedule for an employee with custom parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Beneficiary Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <WalletIcon className="h-4 w-4" />
              <span>Beneficiary Information</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="beneficiary">Wallet Address</Label>
              <Input
                id="beneficiary"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="Enter beneficiary's Solana wallet address"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Token Amount Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CoinsIcon className="h-4 w-4" />
              <span>Token Allocation</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenAmount">Total Token Amount</Label>
              <Input
                id="tokenAmount"
                type="number"
                min="0"
                step="any"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarIcon className="h-4 w-4" />
              <span>Vesting Timeline</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-xs">
                  Start Time
                  <span className="text-muted-foreground ml-1">(Unix)</span>
                </Label>
                <Input
                  id="startTime"
                  type="number"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder={`e.g., ${getCurrentTimestamp()}`}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliffTime" className="text-xs">
                  Cliff Time
                  <span className="text-muted-foreground ml-1">(Unix)</span>
                </Label>
                <Input
                  id="cliffTime"
                  type="number"
                  value={cliffTime}
                  onChange={(e) => setCliffTime(e.target.value)}
                  placeholder={`e.g., ${getCurrentTimestamp() + 2592000}`}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-xs">
                  End Time
                  <span className="text-muted-foreground ml-1">(Unix)</span>
                </Label>
                <Input
                  id="endTime"
                  type="number"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder={`e.g., ${getCurrentTimestamp() + 31536000}`}
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Start &lt; Cliff &lt; End. Current timestamp: {getCurrentTimestamp()}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={onSubmit}
            disabled={createEmployeeAccount.isPending || !isFormValid}
            className="w-full"
            size="lg"
          >
            {createEmployeeAccount.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating Employee...
              </>
            ) : (
              <>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Create Employee Vesting Schedule
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}