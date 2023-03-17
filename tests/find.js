// Test the find, findOne, aggregate, and count methods
import test from 'ava'
import { MongoFetchClient } from '../index.js'
import { ObjectId } from 'bson'

import { startService } from '@drivly/mongo-fetch-api'

test.before(async t => {
  const client = new MongoFetchClient(
    'api',
    { 
      url: 'http://localhost:3000/api',
      apiKey: 'secret'
    }
  )

  t.context.client = client

  // Some test documents for the find-based tests like findOne, and aggregate
  const documents = Array.from({ length: 5 }, (_, i) => i)

  for (const i of documents) {
    try {
      await client
      .db('test')
      .collection('mongo-fetch-client')
      .insertOne({ _id: `unit-test-find-0${i}`, hello: 'world', i })
    } catch (e) {}
  }
})

test('collection.find.limit', async t => {
  const { client } = t.context

  const documents = await client
    .db('test')
    .collection('mongo-fetch-client')
    .find({})
    .limit(1)
    .toArray()

  t.is(documents.length, 1)
})

test('collection.find.skip', async t => {
  const { client } = t.context

  const documents = await client
    .db('test')
    .collection('mongo-fetch-client')
    .find({})
    .skip(1)
    .limit(1)
    .toArray()

  t.is(documents.length, 1)
  t.is(documents[0].i, 1)
})

test('collection.find.sort', async t => {
  const { client } = t.context

  const documents = await client
    .db('test')
    .collection('mongo-fetch-client')
    .find({})
    .sort({ i: -1 })
    .limit(1)
    .toArray()

  t.is(documents.length, 1)
  t.is(documents[0].i, 4)
})

test('collection.find.project', async t => {
  const { client } = t.context

  const documents = await client
    .db('test')
    .collection('mongo-fetch-client')
    .find({})
    .project({ i: 1 })
    .limit(1)
    .toArray()

  t.is(documents.length, 1)
  t.is(documents[0].i, 0)
  t.is(documents[0].hello, undefined)
})

test('collection.findOne', async t => {
  const { client } = t.context

  const document = await client
    .db('test')
    .collection('mongo-fetch-client')
    .findOne({ _id: 'unit-test-find-01' })

  t.is(document.i, 1)
})

test('collection.aggregate', async t => {
  const { client } = t.context

  const documents = await client
    .db('test')
    .collection('mongo-fetch-client')
    .aggregate([
      {
        $match: {
          _id: 'unit-test-find-02'
        }
      }
    ])
    .toArray()

  t.is(documents.length, 1)
  t.is(documents[0].i, 2)
})

test('collection.countDocuments', async t => {
  const { client } = t.context

  const count = await client
    .db('test')
    .collection('mongo-fetch-client')
    .countDocuments()

  t.is(typeof count, 'number')
  t.is(count, 5)
})

test('collection.listCollection', async t => {
  const { client } = t.context

  const collections = await client
    .db('test')
    .listCollections()
    
  t.is(typeof collections, 'object')
  t.is(collections.filter(x => x.name == 'mongo-fetch-client').length, 1)
})

test('collection.listDatabases', async t => {
  const { client } = t.context

  const databases = await client
    .listDatabases()

  t.is(typeof databases, 'object')
  t.is(databases.filter(x => x.name == 'logs').length, 1)
})