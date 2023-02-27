// Test the find, findOne, aggregate, and count methods
import test from 'ava'
import { MongoFetchClient } from '../index.js'
import { ObjectId } from 'bson'

import { startService } from '@drivly/mongo-fetch-api'

test.before(async t => {
  const client = new MongoFetchClient('logs', {
    url: 'http://localhost:3000/api',
    apiKey: 'secret'
  })

  t.context.client = client

  // Some test documents for the find-based tests like findOne, and aggregate
  const documents = await Promise.all(Array.from({ length: 5 }, (_, i) => i).map(async i => {
    try {
      return await client
        .db('test')
        .collection('mongo-fetch-client')
        .insertOne({ _id: `unit-test-find-0${i}`, hello: 'world', i })
    } catch (e) {}
  }))
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