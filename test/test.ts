/* global describe context it */
import { rejects } from 'assert'
import { assert } from 'chai'
import AtHome = require('..')

const wait = (ms: number, result?: any) => new Promise(resolve => setTimeout(resolve, ms, result))

describe('@Home', function () {
  context('Class AtHome', function () {
    it('AtHome()', function () {
      return assert.isFunction(AtHome)
    })
    it('New', function () {
      const home = new AtHome()
      return assert.isObject(home)
    })
    it('preset id', function () {
      const random = String(Math.random())
      const home = new AtHome({ id: random })
      return assert.strictEqual(home.id, random)
    })
  })
  context('Nodes', function () {
    context('join', function () {
      it('id', function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        return assert.isString(id)
      })
      it('preset id', function () {
        const home = new AtHome()
        const random = String(Math.random())
        const id = home.join(() => 233, { id: random })
        return assert.strictEqual(id, random)
      })
      it('power', function () {
        const home = new AtHome()
        home.join(() => 233)
        return assert.strictEqual(home.power, 1)
      })
      it('preset power', function () {
        const home = new AtHome()
        home.join(() => 233, { power: 20 })
        home.join(() => 233)
        return assert.strictEqual(home.power, 21)
      })
      it('list', function () {
        const home = new AtHome()
        home.join(() => 233)
        return assert.strictEqual(home.homes.size, 1)
      })
      // it('busy', function() {
      //   const home = new AtHome()
      //   home.join(() => 233)
      //   return assert.strictEqual(home.busy.length, 1)
      // })
      // it('busy with power', function() {
      //   const home = new AtHome()
      //   home.join(() => 233, { power: 20 })
      //   return assert.strictEqual(home.busy.length, 20)
      // })
    })
    context('quit', function () {
      it('quit', function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        home.quit(id)
        return assert.equal(home.homes.size, 0)
      })
      it('quit with job', async function () {
        const home = new AtHome()
        let id
        const result = home.execute(undefined).catch((e: Error) => e)
        for (let index = 0; index < 6; index++) {
          id = home.join(() => new Promise(() => { }))
          home.pull(id).catch(() => { })
          home.quit(id)
          await wait(1)
        }
        return assert.instanceOf(await result, Error)
      })
    })
    context('Compute', function () {
      it('pull and execute', async function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        home.pull(id)
        const result = await home.execute(undefined)
        return assert.equal(result, 233)
      })
      it('execute and pull ', async function () {
        const home = new AtHome()
        const id = home.join(() => 233)
        const result = home.execute(undefined)
        home.pull(id)
        return assert.equal(await result, 233)
      })
      it('some combinations', async function () {
        this.timeout(1000 * 50)
        const { execute, pull, join } = new AtHome()
        const time = Date.now()
        const workers = Array(10).fill(undefined).map(() => join((n: number) => wait(1000, n + 1)))
        const jobs = []
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        workers.forEach(pull)
        jobs.push(...Array(20).fill(undefined).map(() => execute(20)))
        workers.forEach(pull)
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        workers.forEach(pull)
        workers.forEach(pull)
        await Promise.all(jobs)
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        await Promise.all(jobs)
        const timeEnd = Date.now()
        assert.deepStrictEqual(await Promise.all(jobs), Array(35).fill(21))
        return assert.isBelow(timeEnd - time, 1000 * 2.5)
      })
      it('fall retries', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20 })
        pull(join(() => 10))
        pull(join(() => 21))
        return assert.strictEqual(await execute(), 21)
      })
      it('fall retries again', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20 })
        const id = join(() => 0)
        pull(join(() => 0))
        pull(join(() => 10))
        pull(id)
        pull(id)
        pull(join(() => 21))
        return assert.strictEqual(await execute(), 21)
      })
      it('fall retries > 5 throw', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20 })
        pull(join(() => 10))
        pull(join(() => 10))
        pull(join(() => 10))
        pull(join(() => 10))
        pull(join(() => 10))
        pull(join(() => 10))
        return rejects(execute())
      })
      it('excute with mutiple param', async function () {
        const { execute, pull, join } = new AtHome()
        pull(join((a, b) => a + b))
        return assert.strictEqual(await execute(6, 7), 6 + 7)
      })
      it('fall pull retries', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20 })
        pull(join(() => 10))
        const result = execute()
        pull(join(() => 21))
        return assert.strictEqual(await result, 21)
      })
      it('reject unknow pull', async function () {
        const { pull } = new AtHome({ validator: (n: number) => n > 20 })
        return rejects(pull('233'))
      })
    })
  })
})
