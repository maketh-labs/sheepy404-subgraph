import { BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts'

import { Asset, AssetCount, AvailableAssetIds } from '../generated/schema'

const INTERNAL_NONCE = 'dn404-v1-seed' as string
const LOWEST_ASSET_ID = 1 as i32
export const INITIAL_TOTAL_ASSET_COUNT = 10000 as i32

function getTotalAssetCount(): i32 {
  const assetCountId = 'assetCount'
  let assetCount = AssetCount.load(assetCountId)
  if (!assetCount) {
    assetCount = new AssetCount(assetCountId)
    assetCount.count = BigInt.fromI32(INITIAL_TOTAL_ASSET_COUNT)
    assetCount.save()
  }

  return assetCount.count.toI32()
}

function computeSeed(txHash: Bytes, tokenId: BigInt): ByteArray {
  const combinedInput = txHash
    .concat(Bytes.fromUTF8(tokenId.toString()))
    .concat(Bytes.fromUTF8(INTERNAL_NONCE))
  return crypto.keccak256(combinedInput)
}

function getAvailableAssetIds(): AvailableAssetIds {
  const AVAILABLE_ASSET_IDS_ID = 'availableAssetIds'
  let availableAssetIds = AvailableAssetIds.load(AVAILABLE_ASSET_IDS_ID)
  if (!availableAssetIds) {
    availableAssetIds = new AvailableAssetIds(AVAILABLE_ASSET_IDS_ID)
    const assetIds: i32[] = []

    const totalAssetCount = getTotalAssetCount()
    for (let i: i32 = 0; i < totalAssetCount; i++) {
      assetIds.push(i + LOWEST_ASSET_ID)
    }

    availableAssetIds.assetIds = assetIds
    availableAssetIds.save()
  }
  return availableAssetIds
}

export function addAssetIdToAvailable(assetId: i32): void {
  const availableAssetIds = getAvailableAssetIds()
  const currentIds = availableAssetIds.assetIds
  currentIds.push(assetId)
  availableAssetIds.assetIds = currentIds
  availableAssetIds.save()
}

function removeAssetIdFromAvailableByIndex(index: i32): void {
  const availableAssetIds = getAvailableAssetIds()
  const currentIds = availableAssetIds.assetIds

  if (index >= 0 && index < currentIds.length) {
    const lastIndex = currentIds.length - 1
    currentIds[index] = currentIds[lastIndex]
    currentIds.pop()
    availableAssetIds.assetIds = currentIds
    availableAssetIds.save()
  }
}

export function addNewAssetIdsToAvailable(oldCount: i32, newCount: i32): void {
  if (newCount <= oldCount) {
    return
  }
  const availableAssetIds = getAvailableAssetIds()
  const currentIds = availableAssetIds.assetIds
  for (
    let i: i32 = LOWEST_ASSET_ID + oldCount;
    i < LOWEST_ASSET_ID + newCount;
    i++
  ) {
    currentIds.push(i)
  }
  availableAssetIds.assetIds = currentIds
  availableAssetIds.save()
}

export function pickAvailableAssetId(txHash: Bytes, tokenId: BigInt): i32 {
  const availableAssetIds = getAvailableAssetIds()
  const availableIds = availableAssetIds.assetIds

  if (availableIds.length == 0) {
    return 0
  }

  const seed = computeSeed(txHash, tokenId)
  const seedValue = BigInt.fromUnsignedBytes(seed)
  const randomIndex = seedValue.mod(BigInt.fromI32(availableIds.length)).toI32()
  const assetId = availableIds[randomIndex]
  removeAssetIdFromAvailableByIndex(randomIndex)

  const assetIdString = assetId.toString()
  let asset = Asset.load(assetIdString)

  if (!asset) {
    asset = new Asset(assetIdString)
    asset.save()
    return assetId
  } else if (asset.assignedTo === null) {
    return assetId
  } else {
    throw new Error('Asset in available list is already assigned')
  }
}
