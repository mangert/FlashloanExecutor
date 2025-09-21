import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { FakeTokensSwapped } from "../generated/schema"
import { FakeTokensSwapped as FakeTokensSwappedEvent } from "../generated/FlashloanExecutor/FlashloanExecutor"
import { handleFakeTokensSwapped } from "../src/flashloan-executor"
import { createFakeTokensSwappedEvent } from "./flashloan-executor-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let tokenIn = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let amountIn = BigInt.fromI32(234)
    let tokenOut = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let amountOut = BigInt.fromI32(234)
    let newFakeTokensSwappedEvent = createFakeTokensSwappedEvent(
      tokenIn,
      amountIn,
      tokenOut,
      amountOut
    )
    handleFakeTokensSwapped(newFakeTokensSwappedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("FakeTokensSwapped created and stored", () => {
    assert.entityCount("FakeTokensSwapped", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "FakeTokensSwapped",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokenIn",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "FakeTokensSwapped",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amountIn",
      "234"
    )
    assert.fieldEquals(
      "FakeTokensSwapped",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokenOut",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "FakeTokensSwapped",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amountOut",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
