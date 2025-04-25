import { BigInt } from '@graphprotocol/graph-ts'

import {
  AssetCount as AssetCountEvent,
  Reroll,
  Reset,
  Reveal,
} from '../generated/Sheepy404/Sheepy404'
import { Asset, AssetCount, Token } from '../generated/schema'

import {
  addAssetIdToAvailable,
  addNewAssetIdsToAvailable,
  INITIAL_TOTAL_ASSET_COUNT,
  pickAvailableAssetId,
} from './utils'

export function handleReveal(event: Reveal): void {
  const tokenId = event.params.tokenId
  const tokenIdString = tokenId.toString()

  let token = Token.load(tokenIdString)
  if (!token) {
    token = new Token(tokenIdString)
    token.revealed = false
    token.rerollCount = 0
  }

  if (!token.revealed) {
    const assetId = pickAvailableAssetId(event.transaction.hash, tokenId)

    if (assetId == 0) {
      throw new Error('No available asset IDs found for reveal')
    }

    const assetIdString = assetId.toString()

    let asset = Asset.load(assetIdString)
    if (!asset) {
      asset = new Asset(assetIdString)
    }

    token.asset = assetIdString
    asset.assignedTo = tokenIdString

    token.revealed = true

    asset.save()
    token.save()
  }
}

export function handleReroll(event: Reroll): void {
  const tokenId = event.params.tokenId
  const tokenIdString = tokenId.toString()

  let token = Token.load(tokenIdString)
  if (!token) {
    token = new Token(tokenIdString)
    token.revealed = false
    token.rerollCount = 0
  }

  if (token.asset) {
    const assetId = pickAvailableAssetId(event.transaction.hash, tokenId)
    if (assetId == 0) {
      token.rerollCount = token.rerollCount + 1
      token.save()
      return
    }

    const previousAsset = Asset.load(token.asset!)
    if (previousAsset) {
      previousAsset.assignedTo = null
      previousAsset.save()
      addAssetIdToAvailable(parseInt(token.asset!, 10) as i32)
    }
    const assetIdString = assetId.toString()

    let asset = Asset.load(assetIdString)
    if (!asset) {
      asset = new Asset(assetIdString)
    }

    token.asset = assetIdString
    asset.assignedTo = tokenIdString

    token.revealed = true
    token.rerollCount = token.rerollCount + 1

    asset.save()
  }
  token.save()
}

export function handleReset(event: Reset): void {
  const tokenId = event.params.tokenId
  const tokenIdString = tokenId.toString()

  let token = Token.load(tokenIdString)
  if (!token) {
    token = new Token(tokenIdString)
    token.revealed = false
    token.rerollCount = 0
    token.save()
    return
  }

  if (token.asset) {
    const previousAsset = Asset.load(token.asset!)
    if (previousAsset) {
      previousAsset.assignedTo = null
      previousAsset.save()
      addAssetIdToAvailable(parseInt(token.asset!, 10) as i32)
    }

    token.asset = null
    token.revealed = false
    token.rerollCount = 0
    token.save()
  }
}

export function handleSetAssetCount(event: AssetCountEvent): void {
  const assetCountId = 'assetCount'
  let assetCount = AssetCount.load(assetCountId)
  if (!assetCount) {
    assetCount = new AssetCount(assetCountId)
    assetCount.count = BigInt.fromI32(INITIAL_TOTAL_ASSET_COUNT)
  }

  const oldCount = assetCount.count.toI32()
  const newCount = event.params.newAssetCount.toI32()
  if (newCount > oldCount) {
    assetCount.count = event.params.newAssetCount
    addNewAssetIdsToAvailable(oldCount, newCount)
  }
  assetCount.save()
}
