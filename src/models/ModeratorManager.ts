import Profile from './Profile'
import Settings from './Settings'
import { webSocketResponsesInstance } from './WebsocketResponses'

interface Moderators {
  selectedModerators: Profile[]
  availableModerators: Profile[]
  favoriteModerators: Profile[]
  recentModerators: Profile[]
  searchResultModerators: Profile[]
}

class ModeratorManager implements Moderators {
  public selectedModerators: Profile[] = []
  public availableModerators: Profile[] = []
  public favoriteModerators: Profile[] = []
  public recentModerators: Profile[] = []
  public searchResultModerators: Profile[] = []
  public settings: Settings = new Settings()
  public debounce: number = 0

  public async initialize(settings: Settings) {
    this.settings = settings
    const favoriteModeratorsRequest = settings.storeModerators.map(moderator =>
      Profile.retrieve(moderator)
    )
    const recentModeratorsRequest = settings.recentModerators.map(moderator =>
      Profile.retrieve(moderator)
    )
    const favoriteModerators = await Promise.all(favoriteModeratorsRequest)
    const recentModerators = await Promise.all(recentModeratorsRequest)
    this.favoriteModerators = favoriteModerators
    this.recentModerators = recentModerators
    const asyncModeratorList = [...webSocketResponsesInstance.moderators]
    this.availableModerators = [...this.availableModerators, ...asyncModeratorList]

    const resolveAsyncModerators = (e: CustomEvent) => {
      this.availableModerators = [...this.availableModerators, e.detail]
    }
    window.addEventListener('moderator-resolve', resolveAsyncModerators as EventListener)
  }

  public async setSelectedModerators(moderatorIDs: string[]) {
    const selectedModeratorsRequest = moderatorIDs.map(moderator => Profile.retrieve(moderator))
    const seletedModerators = await Promise.all(selectedModeratorsRequest)
    this.selectedModerators = seletedModerators
  }

  public selectModerator(moderator: Profile, moderatorSource: string, index: number) {
    if (moderatorSource === 'searchResultModerators') {
      /**
       * Search selection is most likely found on 'available moderators' list
       */
      if (!this.favoriteModerators.some(mod => mod.peerID === moderator.peerID)) {
        this.saveRecentModerator(moderator)
      }
    } else if (moderatorSource === 'availableModerators') {
      this.saveRecentModerator(moderator)
    }
    this[moderatorSource].splice(index, 1)
    if (!this.selectedModerators.some(mod => mod.peerID === moderator.peerID)) {
      this.selectedModerators.push(moderator)
    }
  }

  public async saveRecentModerator(moderator: Profile) {
    if (!this.recentModerators.some(mod => moderator.peerID === mod.peerID)) {
      this.recentModerators.unshift(moderator)
      this.recentModerators.splice(5)
      const settings = this.settings
      settings.recentModerators = this.recentModerators.map(mod => mod.peerID)
      await settings.update({
        recentModerators: settings.recentModerators,
      })
    }
  }

  public removeModeratorFromSelection(moderator: Profile, index: number) {
    this.selectedModerators.splice(index, 1)
    if (this.settings.storeModerators.includes(moderator.peerID)) {
      this.favoriteModerators.push(moderator)
    } else {
      this.availableModerators.push(moderator)
    }
  }

  public async find(searchString: string) {
    if (!searchString) {
      this.searchResultModerators = []
      return
    }

    this.searchResultModerators = this.availableModerators.filter(
      moderator =>
        moderator.peerID === searchString ||
        new RegExp('\\b' + searchString + '.*', 'ig').test(moderator.name)
    )

    const PROFILE_ID_LENGTH = 46
    if (searchString.length < PROFILE_ID_LENGTH || searchString.trim().includes(' ')) {
      return
    }

    const isAlreadySelected = this.selectedModerators.some(
      moderator => moderator.peerID === searchString
    )

    if (isAlreadySelected) {
      return
    }

    const moderatorProfileResult = await Profile.retrieve(searchString)
    if (moderatorProfileResult.moderator) {
      this.searchResultModerators.push(moderatorProfileResult)
    }
  }
}

const moderatorManagerInstance = new ModeratorManager()
export { ModeratorManager, moderatorManagerInstance }
