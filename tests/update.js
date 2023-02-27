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

test('collection.updateOne', async t => {
  const { client } = t.context

  const document = await client
    .db('test')
    .collection('mongo-fetch-client')
    .insertOne({ _id: 'unit-test-update-00', version: 1 })

  t.is(document.insertedId, 'unit-test-update-00')

  const updateResult = await client
    .db('test')
    .collection('mongo-fetch-client')
    .updateOne({ _id: 'unit-test-update-00' }, { $set: { version: 2 } })

  t.is(updateResult.matchedCount, 1)

  const updatedDocument = await client
    .db('test')
    .collection('mongo-fetch-client')
    .findOne({ _id: 'unit-test-update-00' })

  t.is(updatedDocument.version, 2)

  const deleteResult = await client
    .db('test')
    .collection('mongo-fetch-client')
    .deleteOne({ _id: 'unit-test-update-00' })
    
  t.is(deleteResult.deletedCount, 1)
})