import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
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
} from "../generated/FlashloanExecutor/FlashloanExecutor"

export function createFakeTokensSwappedEvent(
  tokenIn: Address,
  amountIn: BigInt,
  tokenOut: Address,
  amountOut: BigInt
): FakeTokensSwapped {
  let fakeTokensSwappedEvent = changetype<FakeTokensSwapped>(newMockEvent())

  fakeTokensSwappedEvent.parameters = new Array()

  fakeTokensSwappedEvent.parameters.push(
    new ethereum.EventParam("tokenIn", ethereum.Value.fromAddress(tokenIn))
  )
  fakeTokensSwappedEvent.parameters.push(
    new ethereum.EventParam(
      "amountIn",
      ethereum.Value.fromUnsignedBigInt(amountIn)
    )
  )
  fakeTokensSwappedEvent.parameters.push(
    new ethereum.EventParam("tokenOut", ethereum.Value.fromAddress(tokenOut))
  )
  fakeTokensSwappedEvent.parameters.push(
    new ethereum.EventParam(
      "amountOut",
      ethereum.Value.fromUnsignedBigInt(amountOut)
    )
  )

  return fakeTokensSwappedEvent
}

export function createFlashLoanExecutedEvent(
  asset: Address,
  amount: BigInt,
  premium: BigInt
): FlashLoanExecuted {
  let flashLoanExecutedEvent = changetype<FlashLoanExecuted>(newMockEvent())

  flashLoanExecutedEvent.parameters = new Array()

  flashLoanExecutedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  flashLoanExecutedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  flashLoanExecutedEvent.parameters.push(
    new ethereum.EventParam(
      "premium",
      ethereum.Value.fromUnsignedBigInt(premium)
    )
  )

  return flashLoanExecutedEvent
}

export function createFundsDepositedEvent(
  token: Address,
  amount: BigInt,
  depositor: Address
): FundsDeposited {
  let fundsDepositedEvent = changetype<FundsDeposited>(newMockEvent())

  fundsDepositedEvent.parameters = new Array()

  fundsDepositedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  fundsDepositedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  fundsDepositedEvent.parameters.push(
    new ethereum.EventParam("depositor", ethereum.Value.fromAddress(depositor))
  )

  return fundsDepositedEvent
}

export function createFundsWithdrawnEvent(
  value: BigInt,
  recipient: Address
): FundsWithdrawn {
  let fundsWithdrawnEvent = changetype<FundsWithdrawn>(newMockEvent())

  fundsWithdrawnEvent.parameters = new Array()

  fundsWithdrawnEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )
  fundsWithdrawnEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )

  return fundsWithdrawnEvent
}

export function createFundsWithdrawn1Event(
  token: Address,
  amount: BigInt,
  recipient: Address
): FundsWithdrawn1 {
  let fundsWithdrawn1Event = changetype<FundsWithdrawn1>(newMockEvent())

  fundsWithdrawn1Event.parameters = new Array()

  fundsWithdrawn1Event.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  fundsWithdrawn1Event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  fundsWithdrawn1Event.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )

  return fundsWithdrawn1Event
}

export function createNewFeedAddedEvent(pair: Bytes): NewFeedAdded {
  let newFeedAddedEvent = changetype<NewFeedAdded>(newMockEvent())

  newFeedAddedEvent.parameters = new Array()

  newFeedAddedEvent.parameters.push(
    new ethereum.EventParam("pair", ethereum.Value.fromFixedBytes(pair))
  )

  return newFeedAddedEvent
}

export function createNewPoolAddedEvent(pair: Bytes): NewPoolAdded {
  let newPoolAddedEvent = changetype<NewPoolAdded>(newMockEvent())

  newPoolAddedEvent.parameters = new Array()

  newPoolAddedEvent.parameters.push(
    new ethereum.EventParam("pair", ethereum.Value.fromFixedBytes(pair))
  )

  return newPoolAddedEvent
}

export function createOracleCheckedEvent(
  pairPrice: BigInt,
  pair: Bytes
): OracleChecked {
  let oracleCheckedEvent = changetype<OracleChecked>(newMockEvent())

  oracleCheckedEvent.parameters = new Array()

  oracleCheckedEvent.parameters.push(
    new ethereum.EventParam(
      "pairPrice",
      ethereum.Value.fromUnsignedBigInt(pairPrice)
    )
  )
  oracleCheckedEvent.parameters.push(
    new ethereum.EventParam("pair", ethereum.Value.fromFixedBytes(pair))
  )

  return oracleCheckedEvent
}

export function createTokensSwappedEvent(
  tokenIn: Address,
  amountIn: BigInt,
  tokenOut: Address,
  amountOut: BigInt
): TokensSwapped {
  let tokensSwappedEvent = changetype<TokensSwapped>(newMockEvent())

  tokensSwappedEvent.parameters = new Array()

  tokensSwappedEvent.parameters.push(
    new ethereum.EventParam("tokenIn", ethereum.Value.fromAddress(tokenIn))
  )
  tokensSwappedEvent.parameters.push(
    new ethereum.EventParam(
      "amountIn",
      ethereum.Value.fromUnsignedBigInt(amountIn)
    )
  )
  tokensSwappedEvent.parameters.push(
    new ethereum.EventParam("tokenOut", ethereum.Value.fromAddress(tokenOut))
  )
  tokensSwappedEvent.parameters.push(
    new ethereum.EventParam(
      "amountOut",
      ethereum.Value.fromUnsignedBigInt(amountOut)
    )
  )

  return tokensSwappedEvent
}
