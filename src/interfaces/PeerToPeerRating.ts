// Generated by https://quicktype.io

export interface PeerToPeerRating {
  error: string
  ratings: PeerRating[]
}

export type RatingType = 'fulfill' | 'complete'

export interface PeerRating {
  dst: string
  dstpk: Dstpk
  rating: PeerRatingData
  sig: Sig[]
  src: string
  srcpk: Dstpk
  type: RatingType
}

export interface Dstpk {
  bitcoin: string
  identity: string
}

export interface PeerRatingData {
  ratings?: CompletionRating[]
  buyerRating?: FulfillmentRating
  note: string
  orderId: string
  ratingSignature: RatingSignature
  slug: string
  timestamp: string
}

export interface FulfillmentRating {
  comment: string
  fields: Field[]
  orderId: string
  slug: string
  sourceId: string
  targetId: string
  timestamp: string
}

export interface Field {
  max: number
  score: number
  type: string
  weight: number
}

export interface RatingSignature {
  metadata: Metadata
  signature: string
}

export interface Metadata {
  listingSlug: string
  listingTitle: string
  ratingKey: string
  thumbnail: Thumbnail
}

export interface Thumbnail {
  filename: string
  large: string
  medium: string
  original: string
  small: string
  tiny: string
}

export interface CompletionRating {
  ratingData: CompletionRatingData
  signature: string
}

export interface CompletionRatingData {
  buyerID: RID
  buyerName: string
  buyerSig: string
  customerService: number
  deliverySpeed: number
  description: number
  overall: number
  quality: number
  ratingKey: string
  review: string
  timestamp: string
  vendorID: RID
  vendorSig: RatingSignature
}

export interface RID {
  bitcoinSig: string
  handle: string
  peerID: string
  pubkeys: Dstpk
}

export interface Sig {
  section: string
  signatureBytes: string
}
