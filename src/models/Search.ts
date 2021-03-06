import Axios from 'axios'
import config from '../config'
import Values from '../constants/Values.json'
import PlusCode from '../utils/Location/PlusCode'
import Listing, { ListingResponse } from './Listing'

export interface State {
  filters: Ers
  locationRadius: number
  modifiers: Ers
  plusCode: string
  query: string
  sort: string
  sortIndicator: string
  isSearching: boolean
  results: SearchResults
  paginate: Paginate
  transforms: Transform[]
  searchID: string
}

export interface Ers {
  [key: string]: any
}

export interface Paginate {
  limit: number
  start: number
  totalPages: number
  currentPage: number
}

export interface SearchResults {
  data: ListingResponse[]
  count: number
  limit: number
  nextStart: number
}

export interface Transform {
  operation: string
  spec: Spec
}

export interface Spec {
  hash: string
}

class Search implements State {
  public searchID: string = ''
  public sortIndicator: string = ''
  public filters: Ers = {
    'metadata.contractType': 'SERVICE',
    priceMin: '0',
  }
  public locationRadius: number = Values.minLocation
  public modifiers: Ers = {
    'metadata.contractType': '==',
    priceMin: '<=',
  }
  public plusCode: string = ''
  public query: string = ''
  public responseStatus: number = 200
  public sort: string = 'x.item.title <= y.item.title'
  public isSearching: boolean = false
  public results: SearchResults = {
    data: [],
    count: 0,
    limit: 0,
    nextStart: 0,
  }
  public paginate: Paginate = {
    limit: 24,
    start: 0,
    totalPages: 0,
    currentPage: 0,
  }
  public transforms: Transform[] = [
    {
      operation: 'shift',
      spec: {
        hash: 'hash',
      },
    },
  ]
  public advancedSearch: string[] = []

  public original = {
    advancedSearch: [],
    filters: {
      'metadata.contractType': 'SERVICE',
      priceMin: '0',
    },
    locationRadius: Values.minLocation,
    modifiers: {
      'metadata.contractType': '==',
      priceMin: '<=',
    },
    plusCode: '',
    query: '',
    sort: 'x.item.title <= y.item.title',
    sortIndicator: '',
    isSearching: false,
    results: {
      data: [],
      count: 0,
      limit: 0,
      nextStart: 0,
    },
    paginate: {
      limit: 24,
      start: 0,
      totalPages: 0,
      currentPage: 0,
    },
    transforms: [
      {
        operation: 'shift',
        spec: {
          hash: 'hash',
        },
      },
    ],
    CONSTANTS: {
      PAGE_FORWARD: 1,
      PAGE_BACKWARD: -1,
    },
  }

  public CONSTANTS = {
    PAGE_FORWARD: 1,
    PAGE_BACKWARD: -1,
  }

  public constructor() {
    this.saveAsOriginal()
    this.searchID = Math.random().toString()
  }

  public async nextPage() {
    return await this.executePaginate(this.CONSTANTS.PAGE_FORWARD)
  }

  public async previousPage() {
    return await this.executePaginate(this.CONSTANTS.PAGE_BACKWARD)
  }

  public async executePaginate(direction: number) {
    if (direction === -1 && this.paginate.start <= 0) {
      return
    }

    this.paginate.start = direction * this.paginate.limit

    if (this.paginate.start >= this.results.count) {
      return
    }

    this.paginate.currentPage = direction

    return await this.execute()
  }

  public saveAsOriginal() {
    this.original = JSON.parse(JSON.stringify(this))
  }

  public reset() {
    /**
     * Prevent mutation of `this.original` object due to Object.assign()
     */
    const originalClone = JSON.parse(JSON.stringify(this.original))
    Object.assign(this, originalClone)
    this.searchID = Math.random().toString()
    return this
  }

  public async executeSort(target: string) {
    const data = target.split('_')
    const field = data[0]
    const condition = data[1]
    this.sort = `x.${field} ${condition} y.${field}`
    this.sortIndicator = target
    return await this.execute()
  }

  public async execute(query?: string): Promise<Search> {
    if (query) {
      this.query = query
    }

    /**
     * Clone search params to prevent mutation of original search
     * which may contain DOM information
     */
    const searchParams = JSON.parse(JSON.stringify(this))

    const priceMin = searchParams.filters.priceMin * 100
    const priceMax = searchParams.filters.priceMax * 100

    let priceRange

    if (priceMin >= 0) {
      priceRange = `doc.item.price >= ${priceMin}`
    }

    if (priceMax >= 0) {
      priceRange += `&& doc.item.price <= ${priceMax}`
    }

    delete searchParams.filters.priceMin
    delete searchParams.filters.priceMax

    const keys = Object.keys(searchParams.filters)
    const values = Object.values(searchParams.filters)

    let extendedFilters = keys.map((key, index) => {
      if (values[index] === '') {
        return null
      }
      if (key === 'item.categories') {
        return `containsInArr(doc.item.categories, "${values[index]}")`
      }
      return 'doc.' + key + ' ' + searchParams.modifiers[key] + ' "' + values[index] + '"'
    })

    if (searchParams.locationRadius > -1 && searchParams.filters['location.zipCode']) {
      extendedFilters = extendedFilters.map(filter => {
        if (filter && filter.includes(searchParams.filters['location.zipCode'])) {
          return `zipWithin("${searchParams.filters['location.zipCode']}", "${searchParams.filters['location.country']}", doc.location.zipCode, doc.location.country, ${searchParams.locationRadius})`
        } else {
          return filter
        }
      })
    }

    if (searchParams.plusCode) {
      const locationRadiusFilter =
        searchParams.locationRadius > -1 ? searchParams.locationRadius : 0
      const { latitudeCenter, longitudeCenter } = PlusCode.decode(searchParams.plusCode)
      extendedFilters.push(
        `geoWithin("${latitudeCenter}", "${longitudeCenter}", doc.location.latitude, doc.location.longitude, ${locationRadiusFilter})`
      )
    }

    if (priceRange) {
      extendedFilters.push(priceRange)
    }

    extendedFilters = [...extendedFilters, ...this.advancedSearch]

    const searchObject = {
      query: searchParams.query,
      filters: extendedFilters,
      limit: searchParams.paginate.limit,
      start: searchParams.paginate.start,
      sort: searchParams.sort,
      transforms: searchParams.transforms,
    }

    const result = await Axios.post(`${config.kimitzuHost}/kimitzu/search`, searchObject, {
      withCredentials: true,
    })
    this.responseStatus = result.status
    this.paginate.totalPages = Math.ceil(result.data.count / this.paginate.limit)

    if (result.data.data) {
      let listings

      try {
        listings = await Promise.all(
          result.data.data.map((d: Spec) => Listing.retrieve(d.hash).catch(error => null))
        )
        result.data.data = listings
      } catch (e) {
        result.data.data = []
      }
    }

    this.results = result.data as SearchResults
    return this
  }
}

const searchInstance = new Search()
export { searchInstance, Search }
