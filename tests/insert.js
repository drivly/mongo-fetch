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
})

test('collection.insertOne -> deleteOne', async t => {
  const { client } = t.context

  const document = await client
    .db('test')
    .collection('mongo-fetch-client')
    .insertOne({ _id: 'unit-test-insert-01', hello: 'world' })

  t.is(document.insertedId, 'unit-test-insert-01')

  const deleteResult = await client
    .db('test')
    .collection('mongo-fetch-client')
    .deleteOne({ _id: 'unit-test-insert-01' })
  
  t.is(deleteResult.deletedCount, 1)
})

test('Generate _id on insert if document is missing one', async t => {
  const { client } = t.context

  const document = await client
    .db('test')
    .collection('mongo-fetch-client')
    .insertOne({ hello: 'world' })

  t.true(document.insertedId instanceof ObjectId)

  await client
    .db('test')
    .collection('mongo-fetch-client')
    .deleteOne({ _id: document.insertedId })
})