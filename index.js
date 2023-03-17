// Mongo Data API client that tries its best to be a drop-in replacement for the official MongoDB Node.js driver.
import { EJSON } from 'bson'

export class MongoFetchClient {
  constructor(dataSource, options) {
    this.dataSource = dataSource
    this.url = options.url
    this.apiKey = options.apiKey
    this.fetch = options.fetch || globalThis.fetch

    if (!this.fetch) {
      throw new Error('No fetch implementation found. Please provide one in the options. (e.g. { fetch: require(\'node-fetch\') })')
    }

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

  async listDatabases() {
    const command = {
      database: 'dummy',
      collection: ''
    }

    const response = await this.executeCommand(
      'listDatabases',
      command
    )

    return response.databases
  }

  // Execute command will allow us to unify all of our operations to one single API call.
  // This is a private method, and should not be used directly.1
  async executeCommand(action, options) {
    const command = options
    command.dataSource = this.dataSource

    const url = `${this.url.replace('/v1', '')}/v1/action/${action}`

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

    delete command.options

    const response = await fetch(url, {
      method: 'POST',
      body: EJSON.stringify(command),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': this.apiKey
      }
    })

    if (!response.ok) {
      const body = await response.json()
      const error = new Error(body.error)
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

  async listCollections() {
    const command = {
      database: this.name
    }

    const response = await this.client.executeCommand(
      'listCollections',
      command
    )

    return response.collections
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

  find(filter) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter
    }

    return new MongoFetchCursor(this.client, this.database, this, filter)
  }

  aggregate(pipeline) {
    const command = {
      database: this.database.name,
      collection: this.name,
      pipeline
    }

    return new MongoFetchAggregateCursor(this.client, this.database, this, pipeline)
  }

  async findOne(filter, projection) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      projection
    }

    const response = await this.client.executeCommand(
      'findOne',
      command
    )

    return response.document
  }

  async countDocuments(filter) {
    // @drivly/mongo-fetch-api exclusive method.
    // Atlas doesn't support this yet.
    // Recommended filter is { _id: { $exists: true } } to count all documents.
    // This allows for use of the index on _id.

    const command = {
      database: this.database.name,
      collection: this.name,
      filter: filter || { _id: { $exists: true } } // lets just put a default if they don't provide one.
    }

    const response = await this.client.executeCommand(
      'countDocuments',
      command
    )

    return response.count
  }

  async estimatedDocumentCount() {
    // @drivly/mongo-fetch-api exclusive method.
    // Atlas doesn't support this yet.

    const command = {
      database: this.database.name,
      collection: this.name
    }

    const response = await this.client.executeCommand(
      'estimatedDocumentCount',
      command
    )

    return response.count
  }

  async insertOne(document) {
    // No need for a cursor as its a straight API request.
    const command = {
      database: this.database.name,
      collection: this.name,
      document
    }

    const response = await this.client.executeCommand(
      'insertOne',
      command
    )

    response.acknowledged = true

    return response
  }

  async insertMany(documents) {
    // No need for a cursor as its a straight API request.
    const command = {
      database: this.database.name,
      collection: this.name,
      documents
    }

    const response = await this.client.executeCommand(
      'insertMany',
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

    const response = await this.client.executeCommand(
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

    const response = await this.client.executeCommand(
      'deleteMany',
      command
    )

    response.acknowledged = true

    return response
  }

  async updateOne(filter, update) {
    const command = {
      database: this.database.name,
      collection: this.name,
      filter,
      update
    }

    const response = await this.client.executeCommand(
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
      update
    }

    const response = await this.client.executeCommand(
      'updateMany',
      command
    )

    response.acknowledged = true

    return response
  }
}

class MongoFetchCursor {
  constructor(client, database, collection, filter) {
    this.client = client
    this.database = database
    this.collection = collection
    this.filter = filter
    this.options = {}

    this.args = {}
    
    this.resultsIndex = 0 // Used to keep track of where we are in the results array.
  }

  async toArray() {
    const command = {
      database: this.database.name,
      collection: this.collection.name,
      filter: this.filter,
      ...this.args
    }

    const response = await this.client.executeCommand(
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
  constructor(client, database, collection, pipeline) {
    this.client = client
    this.database = database
    this.collection = collection
    this.pipeline = pipeline
    this.options = {}

    this.args = {}
    
    this.resultsIndex = 0 // Used to keep track of where we are in the results array.
  }

  async toArray() {
    const command = {
      database: this.database.name,
      collection: this.collection.name,
      pipeline: this.pipeline,
      ...this.args
    }

    const response = await this.client.executeCommand(
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