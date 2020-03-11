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
      it('list', function () {
        const home = new AtHome()
        home.join(() => 233)
        return assert.strictEqual(home.homes.size, 1)
      })
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
          home.pull(id)
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
        const id = join(() => 10)
        Array(6).fill(undefined).forEach(() => pull(id))
        return rejects(execute())
      })
      it('define fall retries limit', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20, retries: 10 })
        const id = join(() => 10)
        Array(10).fill(undefined).forEach(() => pull(id))
        pull(join(() => 21))
        return assert.strictEqual(await execute(), 21)
      })
      it('define fall retries limit 2', async function () {
        const { execute, pull, join } = new AtHome({ validator: (n: number) => n > 20, retries: 10 })
        const id = join(() => 10)
        Array(11).fill(undefined).forEach(() => pull(id))
        pull(join(() => 21))
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
      it('quit after execute', async function () {
        const { pull, join, execute, quit } = new AtHome({ validator: (n: number) => n > 20 })
        const id = join(() => 23)
        pull(id)
        const result = await execute()
        quit(id)
        return assert.strictEqual(result, 23)
      })
    })
    context('Statistics', function () {
      it('home resolves++', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(() => 21)
        home.pull(id)
        home.pull(id)
        await home.execute()
        await home.execute()
        return assert.strictEqual(home.homes.get(id).resolves, 2)
      })
      it('home rejects++', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(() => 19)
        home.pull(id)
        home.pull(id)
        home.pull(home.join(() => 21))
        await home.execute()
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('combination', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(n => n + 19)
        home.pull(id)
        home.pull(id)
        home.pull(id)
        home.pull(home.join(() => 21))
        await home.execute(2)
        await home.execute(0)
        assert.strictEqual(home.homes.get(id).resolves, 1)
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('detect throw', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(() => {
          throw new Error('oh nooooooo!')
        })
        home.pull(id)
        home.pull(id)
        home.pull(home.join(() => 21))
        await home.execute()
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('detect promise reject', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(() => new Promise((resolve, reject) => reject(new Error('oh noooooo!'))))
        home.pull(id)
        home.pull(id)
        home.pull(home.join(() => 21))
        await home.execute()
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('update lastSeen at join', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const now = Date.now()
        const id = home.join(n => new Promise(resolve => resolve(n + 2)))
        return assert.isAtLeast(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen at pull', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(n => new Promise(resolve => resolve(n + 2)))
        const now = home.homes.get(id).lastSeen
        await wait(20)
        home.pull(id)
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen after execute', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20 })
        const id = home.join(n => new Promise(resolve => resolve(n + 2)))
        home.pull(id)
        const now = home.homes.get(id).lastSeen
        await wait(20)
        await home.execute(19)
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen after execute falls', async function () {
        const home = new AtHome({ validator: (n: number) => n > 20, retries: 0 })
        const id = home.join(n => new Promise(resolve => resolve(n + 2)))
        home.pull(id)
        const now = home.homes.get(id).lastSeen
        await wait(20)
        await home.execute(17).catch(() => { })
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
    })
  })
})
