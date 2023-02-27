# Mongo Fetch Client - Data API driver

This client is a HTTP adapter for the Data API, allowing you to access data as if you were connecting to a MongoDB database directly. While it is not a full replacement for the MongoDB driver, it does provide a way to access MongoDB from a browser or edge-computing service like Cloudflare Workers.

## Usage

```js
import { MongoFetchClient } from 'mongo-fetch-client'

const client = new MongoFetchClient(
  'clusterName', // The cluster name in our self-hosted Data API, otherwise this is the dataSource.
  {
    url: 'https://data-api.example.com',
    apiKey: 'secret' // API key for authenticating with the API
  }
)

const documents = await client
  .db('database')
  .collection('collection')
  .find({ name: 'John' })
  .limit(2)
  .sort({ age: -1 })
  .project({ name: 1, age: 1 })
  .toArray()
```

## Documentation
Since this driver is a close match for the MongoDB driver, you can use the official MongoDB documentation for reference. The only difference is that you will need to use the `MongoFetchClient` class instead of the `MongoClient` class. You can find the [documentation here](https://mongodb.github.io/node-mongodb-native/5.1/classes/Collection.html).

Heres a list of operations that are supported:
- find
- findOne
- insertOne
- insertMany
- updateOne
- updateMany
- deleteOne
- deleteMany
- aggregate

## Notice
This driver is not 100% compatible with the MongoDB driver. As of right now, this driver only supports basic CRUD, aggregation, and index operations. It does not support transactions, change streams, or other advanced features. As our self-hosted Data API grows, we will add further features to this driver.
