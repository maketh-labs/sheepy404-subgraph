import { BigInt, ByteArray, Bytes, crypto } from '@graphprotocol/graph-ts'

import { Asset } from '../generated/schema'

const INTERNAL_NONCE = 'dn404-v1-seed' as string
const LOWEST_TOKEN_AND_ASSET_ID = 1 as i32
const HIGHEST_TOKEN_AND_ASSET_ID = 10000 as i32
const TOTAL_TOKEN_AND_ASSET_ID_COUNT =
  HIGHEST_TOKEN_AND_ASSET_ID - LOWEST_TOKEN_AND_ASSET_ID + 1

function computeSeed(txHash: Bytes, tokenId: BigInt): ByteArray {
  const combinedInput = txHash
    .concat(Bytes.fromUTF8(tokenId.toString()))
    .concat(Bytes.fromUTF8(INTERNAL_NONCE))
  return crypto.keccak256(combinedInput)
}

export function pickAvailableAssetId(txHash: Bytes, tokenId: BigInt): i32 {
  const seed = computeSeed(txHash, tokenId)
  const seedValue = BigInt.fromUnsignedBytes(seed)
  const startIndex = seedValue
    .mod(BigInt.fromI32(TOTAL_TOKEN_AND_ASSET_ID_COUNT))
    .toI32()

  for (let i = 0; i < TOTAL_TOKEN_AND_ASSET_ID_COUNT; i++) {
    const assetId =
      ((startIndex + i) % TOTAL_TOKEN_AND_ASSET_ID_COUNT) +
      LOWEST_TOKEN_AND_ASSET_ID

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
