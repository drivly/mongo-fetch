// Mongo Data API client that tries its best to be a drop-in replacement for the official MongoDB Node.js driver.
import fetch from 'cross-fetch'
import { EJSON } from 'bson'
import { MongoError } from 'mongodb'

export class MongoFetchClient {
  constructor(dataSource, options) {
    this.dataSource = dataSource
    this.url = options.url
    this.apiKey = options.apiKey

    this.cache = {}

    this.cacheTtl = null
  }

  async connect() {
    // no-op, we don't need to connect to anything
    // as we're just using HTTP.
    return this
  }

  async close() {
    // no-op, we don't need to connect to anything
    // as we're just using HTTP.
    return this
  }

  db(name) {
    return new MongoFetchDatabase(this, name)
  }

  // Execute command will allow us to unify all of our operations to one single API call.
  // This is a private method, and should not be used directly.
  async _executeCommand(action, options, cacheTTL) {
    const command = options
    command.dataSource = this.dataSource

    const url = `${this.url}/v1/action/${action}`

    const cacheKey = `${action}-${JSON.stringify(command)}`

    // const cache = globalThis?.caches?.default

    // if (this.cacheTtl && globalThis.WebSocketPair) {
    //   // We're running inside a cloudflare worker.
    //   // We can use the cache API to cache the results of our requests.
    //   const cachedResponse = await cache.match(
    //     `https://cache.api/${cacheKey}`
    //   )

    //   if (cachedResponse) {
    //     return EJSON.parse(await cachedResponse.text())
    //   }
    // }

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(command),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': this.apiKey
      }
    })

    if (!response.ok) {
      const body = await response.json()
      const error = new MongoError(body.error)
      error.code = body.error.split(' ')[0]
      throw error
    }

    // if (this.cacheTtl && globalThis?.WebSocketPair) {
    //   const ttl = cacheTTL || this.cacheTtl
    //   const seconds = this.parseTTL(ttl)

    //   const body = await response.clone().json()

    //   await cache.put(
    //     `https://cache.api/${cacheKey}`,
    //     new Response(JSON.stringify(body), {
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'Cache-Control': `max-age=${seconds}`
    //       }
    //     })
    //   )
    // }

    if (response.headers.get('content-type') === 'application/ejson') {
      return EJSON.parse(await response.text())
    } else {
      return await response.json()
    }
  }

  parseTTL(ttl) {
    // Turns a string like 2d10m into a number of seconds
    const regex = /(\d+)([a-z])/g
    let seconds = 0

    let match = regex.exec(ttl)
    while (match != null) {
      const number = parseInt(match[1])
      const unit = match[2]
      
      switch (unit) {
        case 's':
          seconds += number
          break
        case 'm':
          seconds += number * 60
          break
        case 'h':
          seconds += number * 60 * 60
          break
        case 'd':
          seconds += number * 60 * 60 * 24
          break
        case 'w':
          seconds += number * 60 * 60 * 24 * 7
          break
        default:
          throw new Error(`Invalid TTL unit: ${unit}`)
      }
    }
    
    return seconds
  }
}

class MongoFetchDatabase {
  constructor(client, name) {
    this.client = client
    this.name = name
  }

  collection(name) {
    return new MongoFetchCollection(this.client, this, name)
  }
}

class MongoFetchCollection {
  constructor (client, database, name) {
    this.client = client
    this.database = database
    this.name = name
  }

  find(filter, options) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      options
    }

    return new MongoFetchCursor(this.client, this.database, this, filter, options)
  }

  aggregate(pipeline, options) {
    const command = {
      database: this.database.name,
      collection: this.name,
      pipeline,
      options
    }

    return new MongoFetchAggregateCursor(this.client, this.database, this, pipeline, options)
  }

  async findOne(filter, projection, options) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      projection,
      options
    }

    const response = await this.client._executeCommand(
      'findOne',
      command
    )

    return response.document
  }

  async insertOne(document) {
    // No need for a cursor as its a straight API request.
    const command = {
      database: this.database.name,
      collection: this.name,
      document
    }

    const response = await this.client._executeCommand(
      'insertOne',
      command
    )

    response.acknowledged = true

    return response
  }

  async deleteOne(filter) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter
    }

    const response = await this.client._executeCommand(
      'deleteOne',
      command
    )

    response.acknowledged = true

    return response
  }

  async deleteMany(filter) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter
    }

    const response = await this.client._executeCommand(
      'deleteMany',
      command
    )

    response.acknowledged = true

    return response
  }

  async updateOne(filter, update, options) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      update,
      options
    }

    const response = await this.client._executeCommand(
      'updateOne',
      command
    )

    response.acknowledged = true

    return response
  }

  async updateMany(filter, update) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      update,
      options
    }

    const response = await this.client._executeCommand(
      'updateMany',
      command
    )

    response.acknowledged = true

    return response
  }
}

class MongoFetchCursor {
  constructor(client, database, collection, filter, options) {
    this.client = client
    this.database = database
    this.collection = collection
    this.filter = filter
    this.options = options || {}

    this.args = {}
    
    this.resultsIndex = 0 // Used to keep track of where we are in the results array.
  }

  async toArray() {
    const command = {
      database: this.database.name,
      collection: this.collection.name,
      filter: this.filter,
      options: this.options,
      ...this.args
    }

    const response = await this.client._executeCommand(
      'find',
      command
    )

    return response.documents
  }

  async next() {
    const results = await this.toArray()

    if (this.resultsIndex >= results.length) {
      return null
    }

    const result = results[this.resultsIndex]
    this.resultsIndex++

    return result
  }

  limit(limit) {
    this.args.limit = limit
    return this
  }

  skip(skip) {
    this.args.skip = skip
    return this
  }
  
  sort(sort) {
    this.args.sort = sort
    return this
  }
  
  project(project) {
    this.args.projection = project
    return this
  }
}

class MongoFetchAggregateCursor {
  constructor(client, database, collection, pipeline, options) {
    this.client = client
    this.database = database
    this.collection = collection
    this.pipeline = pipeline
    this.options = options || {}

    this.args = {}
    
    this.resultsIndex = 0 // Used to keep track of where we are in the results array.
  }

  async toArray() {
    const command = {
      database: this.database.name,
      collection: this.collection.name,
      pipeline: this.pipeline,
      options: this.options,
      ...this.args
    }

    const response = await this.client._executeCommand(
      'aggregate',
      command
    )

    return response.documents
  }

  async next() {
    const results = await this.toArray()

    if (this.resultsIndex >= results.length) {
      return null
    }

    const result = results[this.resultsIndex]
    this.resultsIndex++

    return result
  }
}