import Axios from 'axios'
import config from '../config'
import Image from '../interfaces/Image'
import Location from '../interfaces/Location'
import { Moderator } from '../interfaces/Moderator'
import {
  Background,
  Contact,
  CustomDescription,
  CustomProps,
  EducationHistory,
  EmploymentHistory,
  EXTLocation,
  MetaTags,
  Preferences,
  Profile as ProfileSchema,
  Stats,
} from '../interfaces/Profile'
import Rating, { RatingSummary } from '../interfaces/Rating'

import isElectron from 'is-electron'
import defaults from '../constants/Defaults'
import decodeHtml from '../utils/Unescape'
import { cacheInstance } from './Cache'

const profileDefaults = defaults.profile
const LOCATION_TYPES = ['primary', 'shipping', 'billing', 'return']

class Profile implements ProfileSchema {
  public static async deleteCredentials(username: string, password: string) {
    const deleteRequest = await Axios.delete(`${config.kimitzuHost}/authenticate`, {
      data: {
        username,
        password,
      },
    })
    return deleteRequest
  }

  public static async getFollowersList(peerID?: ProfileSchema['peerID']): Promise<string[]> {
    const followerRequest = await Axios.get(
      `${config.openBazaarHost}/ob/followers${peerID ? `/${peerID}` : ''}`
    )
    return followerRequest.data
  }

  public static async getFollowingList(peerID?: ProfileSchema['peerID']): Promise<string[]> {
    const followerRequest = await Axios.get(
      `${config.openBazaarHost}/ob/following${peerID ? `/${peerID}` : ''}`
    )
    return followerRequest.data
  }

  public static async isFollowing(peerID: string): Promise<boolean> {
    if (!peerID) {
      return false
    }
    const isFollowingRequest = await Axios.get(`${config.openBazaarHost}/ob/isfollowing/${peerID}`)
    return isFollowingRequest.data.isFollowing
  }

  public static async follow(peerID: string) {
    await Axios.post(`${config.openBazaarHost}/ob/follow`, { id: peerID })
  }

  public static async unfollow(peerID: string) {
    await Axios.post(`${config.openBazaarHost}/ob/unfollow`, { id: peerID })
  }

  public static async isAuthenticationActivated(): Promise<boolean> {
    const queryRequest = await Axios.get(`${config.kimitzuHost}/authenticate`)
    return queryRequest.data.authentication as boolean
  }

  public static async login(username, password) {
    const loginRequest = await Axios.post(`${config.kimitzuHost}/authenticate`, {
      username,
      password,
    })
    return loginRequest
  }

  public static async logout() {
    const manipulatedExpireDate = new Date()
    manipulatedExpireDate.setDate(manipulatedExpireDate.getDate() - 1)
    document.cookie = `OpenBazaar_Auth_Cookie='';Expires=${manipulatedExpireDate.toUTCString()};Path=/`
    if (document.cookie) {
      throw new Error('Internal Error: Unable to logout, cannot clear session.')
    }

    if (isElectron()) {
      /**
       * Electron handles cookies differently than browsers.
       */
      const { session } = window.require('electron').remote
      await session.defaultSession.clearStorageData()
    }
  }

  public static async setCredentials(oldUsername, oldPassword, newUsername, newPassword) {
    const newCredentialRequest = await Axios.patch(`${config.kimitzuHost}/authenticate`, {
      username: oldUsername,
      password: oldPassword,
      newUsername,
      newPassword,
    })
    return newCredentialRequest
  }

  public static periodParser(e: EducationHistory | EmploymentHistory) {
    if (e.period) {
      e.period.from = new Date(e.period.from)
      if (e.period.to) {
        e.period.to = new Date(e.period.to!)
        if (isNaN(e.period.to.getTime())) {
          delete e.period.to
        }
      }
    }
  }

  public static periodSorter(
    a: EducationHistory | EmploymentHistory,
    b: EducationHistory | EmploymentHistory
  ) {
    if (a.period && b.period) {
      if (a.period.from === b.period.from) {
        return 0
      }
      return a.period.from < b.period.from ? 1 : -1
    }
    return 0
  }

  public static async addToIndex(id: string): Promise<void> {
    await Axios.get(`${config.kimitzuHost}/kimitzu/peer/add?id=${id}`)
  }

  public static async publish(): Promise<void> {
    await Axios.post(`${config.openBazaarHost}/ob/publish`, {})
  }

  public static async getRatings(
    id: string
  ): Promise<{ ratingsSummary: RatingSummary; ratings: Rating[] }> {
    const ratingsSummaryData = await Axios.get(`${config.openBazaarHost}/ob/ratings/${id}`)
    const ratingsSummary = ratingsSummaryData.data
    let ratings = []
    if (ratingsSummary.ratings && ratingsSummary.ratings.length > 0) {
      const ratingsResponse = await Axios.post(
        `${config.openBazaarHost}/ob/fetchratings`,
        ratingsSummary.ratings
      )
      ratings = ratingsResponse.data
    }
    return { ratingsSummary, ratings }
  }

  public static async getKimitzuRatings(id: string) {
    const fullPeerRatingData = await Axios.get(`${config.kimitzuHost}/p2p/ratings/seek-sync/${id}`)
    return fullPeerRatingData.data
  }

  public static async retrieve(id?: string, force?: boolean): Promise<Profile> {
    let profile: Profile

    const cacheId = id ? id : '~self'
    const profileCache = cacheInstance.retrieve(cacheId)
    if (profileCache) {
      return profileCache
    }

    try {
      if (id) {
        const peerRequest = await Axios.get(
          `${config.kimitzuHost}/kimitzu/peer/get?id=${id}${force ? '&force=true' : ''}`
        )
        const peerInfo = peerRequest.data.profile as Profile
        profile = new Profile(peerInfo)
      } else {
        const profileRequest = await Axios.get(
          `${config.kimitzuHost}/kimitzu/peer/get?id=${force ? '&force=true' : '&force=false'}`
        )
        /**
         * Properly handle when https://github.com/kimitzu/kimitzu-services/issues/3 is resolved.
         */
        if (!profileRequest.data.profile.peerID) {
          throw new Error('Profile not found')
        }
        profile = new Profile(profileRequest.data.profile)
        profile.extLocation = profile.processAddresses(profile.extLocation)
      }
    } catch (e) {
      throw e
    }

    if (profile.customProps.competencies) {
      profile.customProps.competencies = JSON.parse(
        decodeHtml(profile.customProps.competencies as string)
      )
    }

    profile.background!.educationHistory.forEach(Profile.periodParser)
    profile.background!.educationHistory.sort(Profile.periodSorter)
    profile.background!.employmentHistory.forEach(Profile.periodParser)
    profile.background!.employmentHistory.sort(Profile.periodSorter)
    profile.spokenLanguages = ['English', 'Tagalog']
    profile.programmingLanguages = ['Javascript', 'Golang', 'C++']

    if (profile.moderatorInfo.fee.fixedFee && profile.moderatorInfo.fee.fixedFee.amount) {
      profile.moderatorInfo.fee.fixedFee.amount = profile.moderatorInfo.fee.fixedFee.amount / 100
    }

    cacheInstance.store(cacheId, profile)
    return profile
  }

  public about: string = ''
  public avatarHashes: Image = {
    tiny: '',
    small: '',
    medium: '',
    large: '',
    original: '',
  }
  public extLocation: EXTLocation = {
    primary: 0,
    shipping: 0,
    billing: 0,
    return: 0,
    addresses: [
      {
        type: [''],
        latitude: '',
        longitude: '',
        plusCode: '',
        addressOne: '',
        addressTwo: '',
        city: '',
        state: '',
        country: profileDefaults.country,
        zipCode: '',
      },
    ],
  }
  public handle: string = ''
  public moderator: boolean = false
  public moderatorInfo: Moderator = {
    description: '',
    termsAndConditions: '',
    languages: [],
    acceptedCurrencies: [],
    fee: {
      fixedFee: {
        currencyCode: 'USD',
        amount: 0,
      },
      percentage: 0,
      feeType: 'FIXED',
    },
  }
  public name: string = ''
  public nsfw: boolean = false
  public vendor: boolean = true
  public contactInfo: Contact = {
    website: '',
    email: '',
    phoneNumber: '',
    social: [],
  }
  public bitcoinPubkey?: string = ''
  public currencies?: string[] = []
  public headerHashes?: Image = {
    tiny: '',
    small: '',
    medium: '',
    large: '',
    original: '',
  }
  // public lastModified?: string = ''
  public location?: string = ''
  public metaTags?: MetaTags = {
    KimitzuVersion: '',
  }
  public peerID: string = ''
  public preferences: Preferences = {
    currencyDisplay: profileDefaults.currencyDisplay,
    fiat: profileDefaults.fiat,
    cryptocurrency: profileDefaults.cryptocurrency,
    language: profileDefaults.language,
    measurementUnit: profileDefaults.measurementUnit,
  }
  public profileType?: string = ''
  public shortDescription?: string = ''
  public stats?: Stats = {
    followerCount: 0,
    followingCount: 0,
    listingCount: 0,
    ratingCount: 0,
    postCount: 0,
    averageRating: 0,
  }
  public background?: Background = {
    educationHistory: [],
    employmentHistory: [],
  }
  public spokenLanguages?: string[] = ['English', 'Tagalog']
  public programmingLanguages?: string[] = ['Javascript', 'Golang', 'C++']
  public customFields: CustomDescription[] = []
  public customProps: CustomProps = {
    programmerCompetency: '{}',
    competencies: '',
    skills: '[]',
  }

  constructor(props?: ProfileSchema) {
    if (props) {
      Object.assign(this, props)
    }
  }

  public getAddress(type: string): string {
    const addressTypes = ['primary', 'shipping', 'billing', 'return']
    if (!addressTypes.includes(type)) {
      throw new Error('Unknown address type')
    }
    const address = this.extLocation.addresses[this.extLocation[type]]
    if (address.latitude && address.longitude) {
      return `(${address.latitude}, ${address.longitude})`
    }
    if (address.plusCode) {
      return `Plus Code: ${address.plusCode}`
    }
    return `${address.city ? `${address.city}, ` : ''}${address.state ? `${address.state}, ` : ''}${
      address.country ? `${address.country}, ` : ''
    }${address.zipCode ? `${address.zipCode}` : ''}`
  }

  public async save() {
    cacheInstance.delete('~self')
    this.location = this.getAddress('primary')
    await Axios.post(`${config.openBazaarHost}/ob/profile`, this)
    await Profile.publish()
    await Profile.retrieve('', true)
  }

  public preSave() {
    if (this.moderatorInfo.fee.fixedFee && this.moderatorInfo.fee.fixedFee.amount) {
      this.moderatorInfo.fee.fixedFee.amount = this.moderatorInfo.fee.fixedFee.amount * 100
    }
    const firstSentence = this.about.split('.')[0].substr(0, 157)
    this.shortDescription = firstSentence + '...'
    this.customProps.competencies = JSON.stringify(this.customProps.competencies)
  }

  public postSave() {
    const { fixedFee } = this.moderatorInfo.fee
    if (fixedFee && fixedFee.amount) {
      fixedFee.amount = fixedFee.amount / 100
    }
    const { competencies } = this.customProps
    if (competencies) {
      this.customProps.competencies = JSON.parse(decodeHtml(competencies as string))
    }
  }

  public async update() {
    cacheInstance.delete('~self')
    this.location = this.getAddress('primary')
    this.preSave()
    await Axios.put(`${config.openBazaarHost}/ob/profile`, this)
    await Profile.publish()
    this.postSave()
    this.extLocation = this.processAddresses(this.extLocation)
    await Profile.retrieve('', true)
    return this
  }

  public async setModerator(moderatorProfile: Moderator) {
    this.preSave()
    await Axios.put(`${config.openBazaarHost}/ob/moderator`, moderatorProfile)
    await Profile.publish()
    this.postSave()
  }

  public async unsetModerator() {
    await Axios.delete(`${config.openBazaarHost}/ob/moderator/${this.peerID}`)
    await Profile.publish()
  }

  public async crawlOwnListings() {
    await Axios.get(`${config.kimitzuHost}/kimitzu/peer/add?id=${this.peerID}`)
  }

  public processAddresses(extLocation: EXTLocation) {
    extLocation.addresses.forEach(a => {
      a.type = []
    })

    LOCATION_TYPES.forEach(type => {
      const index = extLocation[type] as number
      if (index === -1) {
        return
      }
      extLocation.addresses[index].type!.push(type)
    })

    return extLocation
  }

  public deleteAddress(index: number) {
    const address = this.extLocation.addresses[index]

    address.type!.forEach(t => {
      this.extLocation[t] = -1
    })

    this.extLocation.addresses.splice(index, 1)

    LOCATION_TYPES.forEach(type => {
      const tempIndex = this.extLocation[type]
      if (tempIndex > index) {
        this.extLocation[type] = this.extLocation[type] - 1
      }
    })
  }

  public updateAddresses(address: Location, index?: number) {
    const isEntryNew = index == null || index < 0

    if (isEntryNew) {
      this.extLocation.addresses.push(address)
    }

    /**
     * Update indexes in extLocation which tells what type of address is this, either:
     *    primary: index,
     *    shipping: index,
     *    billing: index,
     *    return: index,
     */
    address.type!.forEach((t: string) => {
      this.extLocation[t] = isEntryNew ? this.extLocation.addresses.length - 1 : index
    })

    if (!isEntryNew) {
      this.extLocation.addresses[index!] = address
    }

    this.processAddresses(this.extLocation)
  }

  public getAvatarSrc(type: string = 'medium') {
    const { avatarHashes } = this
    if (!avatarHashes[type]) {
      return `${process.env.PUBLIC_URL}/images/user.svg`
    }
    return `${config.openBazaarHost}/ob/images/${avatarHashes[type]}`
  }

  public get displayModeratorFee() {
    const { moderatorInfo, moderator } = this
    const { feeType, fixedFee, percentage } = moderatorInfo.fee
    if (!moderator) {
      return 'N/A'
    }
    const fixed = fixedFee ? `${fixedFee.amount.toFixed(2)} ${fixedFee.currencyCode}` : ''

    const percent = percentage ? `${percentage}%` : ''
    switch (feeType) {
      case 'FIXED':
        return fixed
      case 'PERCENTAGE':
        return percent
      case 'FIXED_PLUS_PERCENTAGE':
        return `${fixed} (+${percent})`
      default:
        return '0'
    }
  }
}

export default Profile
