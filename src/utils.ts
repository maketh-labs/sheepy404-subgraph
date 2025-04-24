import { BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts'

import { Asset, AssetCount } from '../generated/schema'

const INTERNAL_NONCE = 'dn404-v1-seed' as string
const LOWEST_ASSET_ID = 1 as i32
const INITIAL_TOTAL_ASSET_COUNT = 10000

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

export function pickAvailableAssetId(txHash: Bytes, tokenId: BigInt): i32 {
  const seed = computeSeed(txHash, tokenId)
  const seedValue = BigInt.fromUnsignedBytes(seed)
  const totalAssetCount = getTotalAssetCount()
  const startIndex = seedValue.mod(BigInt.fromI32(totalAssetCount)).toI32()

  for (let i = 0; i < totalAssetCount; i++) {
    const assetId = ((startIndex + i) % totalAssetCount) + LOWEST_ASSET_ID

    const assetIdString = assetId.toString()
    let asset = Asset.load(assetIdString)

    if (!asset) {
      asset = new Asset(assetIdString)
      asset.save()
      return assetId
    } else if (asset.assignedTo === null) {
      return assetId
    }
  }

  throw new Error('No available asset IDs found')
}
