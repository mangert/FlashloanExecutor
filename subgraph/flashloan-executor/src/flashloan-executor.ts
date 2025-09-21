import {
  FakeTokensSwapped as FakeTokensSwappedEvent,
  FlashLoanExecuted as FlashLoanExecutedEvent,
  FundsDeposited as FundsDepositedEvent,
  FundsWithdrawn as FundsWithdrawnEvent,
  FundsWithdrawn1 as FundsWithdrawn1Event,
  NewFeedAdded as NewFeedAddedEvent,
  NewPoolAdded as NewPoolAddedEvent,
  OracleChecked as OracleCheckedEvent,
  TokensSwapped as TokensSwappedEvent
} from "../generated/FlashloanExecutor/FlashloanExecutor"
import {
  FakeTokensSwapped,
  FlashLoanExecuted,
  FundsDeposited,
  FundsWithdrawn,
  FundsWithdrawn1,
  NewFeedAdded,
  NewPoolAdded,
  OracleChecked,
  TokensSwapped
} from "../generated/schema"

export function handleFakeTokensSwapped(event: FakeTokensSwappedEvent): void {
  let entity = new FakeTokensSwapped(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenIn = event.params.tokenIn
  entity.amountIn = event.params.amountIn
  entity.tokenOut = event.params.tokenOut
  entity.amountOut = event.params.amountOut

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFlashLoanExecuted(event: FlashLoanExecutedEvent): void {
  let entity = new FlashLoanExecuted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.asset = event.params.asset
  entity.amount = event.params.amount
  entity.premium = event.params.premium

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsDeposited(event: FundsDepositedEvent): void {
  let entity = new FundsDeposited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.depositor = event.params.depositor

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsWithdrawn(event: FundsWithdrawnEvent): void {
  let entity = new FundsWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.value = event.params.value
  entity.recipient = event.params.recipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsWithdrawn1(event: FundsWithdrawn1Event): void {
  let entity = new FundsWithdrawn1(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.recipient = event.params.recipient

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewFeedAdded(event: NewFeedAddedEvent): void {
  let entity = new NewFeedAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pair = event.params.pair

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewPoolAdded(event: NewPoolAddedEvent): void {
  let entity = new NewPoolAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pair = event.params.pair

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOracleChecked(event: OracleCheckedEvent): void {
  let entity = new OracleChecked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pairPrice = event.params.pairPrice
  entity.pair = event.params.pair

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokensSwapped(event: TokensSwappedEvent): void {
  let entity = new TokensSwapped(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenIn = event.params.tokenIn
  entity.amountIn = event.params.amountIn
  entity.tokenOut = event.params.tokenOut
  entity.amountOut = event.params.amountOut

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
