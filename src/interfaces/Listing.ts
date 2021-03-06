import Image from './Image'
import Location from './Location'

export interface Listing {
  averageRating: number
  hash: string
  location: Location
  parentPeer: string
  peerSlug: string
  ratingCount: number
  thumbnail: Thumbnail

  nsfw: boolean
  signature: string
  slug: string
  currentSlug: string
  vendorID: VendorID
  metadata: Metadata
  item: Item
  shippingOptions: ShippingOption[]
  coupons: Coupon[]
  moderators: string[]
  termsAndConditions: string
  refundPolicy: string
}

export interface Price {
  amount: number
  currencyCode: string
  modifier: number
}

export interface Thumbnail {
  medium: string
  small: string
  tiny: string
}

export interface Coupon {
  title: string
  discountCode: string
  percentDiscount?: number
  priceDiscount?: number
  type: string
  uniqueId: string
}

// ================================================

export interface Item {
  title: string
  description: string
  processingTime: string
  price: number
  tags: string[]
  images: Image[]
  categories: string[]
  grams: number
  condition: string
  options: any[]
  skus: Skus[]
}

export interface Skus {
  quantity: number
  productID: string
  variantCombo?: string[]
}

export interface Metadata {
  version: number
  contractType: string
  format: string
  expiry: string
  acceptedCurrencies: string[]
  pricingCurrency: string
  language: string
  escrowTimeoutHours: number
  coinType: string
  coinDivisibility: number
  priceModifier: number
  serviceRateMethod: string
  serviceClassification?: string
}

export interface ShippingOption {
  name: string
  type: string
  regions: string[]
  services: Service[]
}

export interface Service {
  name: string
  price: number
  estimatedDelivery: string
  additionalItemPrice: number
}

export interface VendorID {
  peerID: string
  handle: string
  pubkeys: Pubkeys
  bitcoinSig: string
}

export interface Pubkeys {
  identity: string
  bitcoin: string
}
