/* global describe context it */
import { rejects } from 'assert'
import { assert } from 'chai'
import AtHome from '..'

const wait = (ms: number, result?: any) => new Promise(resolve => setTimeout(resolve, ms, result))
const rej = ({ reject }: any) => reject()
const res = (data?: any) => ({ resolve }: any) => resolve(data)

describe('@Home', function() {
  context('readme', function() {
    it('1', async function() {
      const atHome = new AtHome<number[], number>()

      const clusterId = atHome.join()
      atHome.pull(clusterId)
        .then(({ resolve, data: [a, b] }) => resolve(a + b))

      const result = await atHome.execute([3, 4])
      assert.strictEqual(result, 7)
    })
    it('2', async function() {
      const atHome = new AtHome<number, number>()

      const functionTakesLongLongTimeRunsFarFarAway = (n: number) => new Promise<number>(resolve => setTimeout(() => resolve(n * n), 1000))

      const clusterId = atHome.join()

      const result = atHome.execute(8)

      atHome.pull(clusterId).then(async ({ resolve, data }) => resolve(await functionTakesLongLongTimeRunsFarFarAway(data)))
      assert.strictEqual(await result, 64)
    })
  })
  context('Class AtHome', function() {
    it('AtHome()', function() {
      return assert.isFunction(AtHome)
    })
    it('New', function() {
      const home = new AtHome()
      return assert.isObject(home)
    })
  })
  context('Nodes', function() {
    context('join', function() {
      it('id', function() {
        const home = new AtHome()
        const id = home.join()
        return assert.isString(id)
      })
      it('preset id', function() {
        const home = new AtHome()
        const random = String(Math.random())
        const id = home.join({ id: random })
        return assert.strictEqual(id, random)
      })
      it('list', function() {
        const home = new AtHome()
        home.join()
        return assert.strictEqual(home.homes.size, 1)
      })
    })
    context('quit', function() {
      it('quit', function() {
        const home = new AtHome()
        const id = home.join()
        home.quit(id)
        return assert.equal(home.homes.size, 0)
      })
      it('quit with job', async function() {
        const home = new AtHome()
        let id
        const result = home.execute(undefined).catch((e: Error) => e)
        for (let index = 0; index < 6; index++) {
          id = home.join()
          home.pull(id)
          home.quit(id)
          await wait(1)
        }
        return assert.instanceOf(await result, Error)
      })
    })
    context('Compute', function() {
      it('pull and execute', async function() {
        const home = new AtHome()
        const id = home.join()
          ;
        home.pull(id).then(({ resolve }) => resolve(233))
        const result = await home.execute(undefined)
        return assert.equal(result, 233)
      })
      it('execute and pull ', async function() {
        const home = new AtHome()
        const id = home.join()
        const result = home.execute(undefined)
          ;
        (await home.pull(id)).resolve(233)
        return assert.equal(await result, 233)
      })
      it('some combinations', async function() {
        this.timeout(1000 * 50)
        const { execute, pull, join } = new AtHome<number, number>()
        const time = Date.now()
        const workers = Array(10).fill(undefined).map(() => join())
        const jobs = []
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        workers.forEach(worker => pull(worker).then(({ resolve, data }) => wait(1000).then(() => resolve(data + 1))))
        jobs.push(...Array(20).fill(undefined).map(() => execute(20)))
        workers.forEach(worker => pull(worker).then(({ resolve, data }) => wait(1000).then(() => resolve(data + 1))))
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        workers.forEach(worker => pull(worker).then(({ resolve, data }) => wait(1000).then(() => resolve(data + 1))))
        workers.forEach(worker => pull(worker).then(({ resolve, data }) => wait(1000).then(() => resolve(data + 1))))
        await Promise.all(jobs)
        jobs.push(...Array(5).fill(undefined).map(() => execute(20)))
        await Promise.all(jobs)
        const timeEnd = Date.now()
        assert.deepStrictEqual(await Promise.all(jobs), Array(35).fill(21))
        return assert.isBelow(timeEnd - time, 1000 * 2.5)
      })
      it('fall retries', async function() {
        const { execute, pull, join } = new AtHome()
          ;
        pull(join()).then(({ reject }) => reject())
          ;
        pull(join()).then(({ resolve }) => resolve(21))
        return assert.strictEqual(await execute(undefined), 21)
      })
      it('fall retries again', async function() {
        const { execute, pull, join } = new AtHome({})
        const id = join()
        pull(join()).then(rej)
        pull(join()).then(rej)
        pull(id).then(rej)
        pull(id).then(rej)
        pull(join()).then(res(21))
        pull(join()).then(res(18))
        return assert.strictEqual(await execute(undefined), 21)
      })
      it('fall retries > 5 throw', async function() {
        const { execute, pull, join } = new AtHome()
        const id = join()
        Array(6).fill(undefined).forEach(() => pull(id).then(({ reject }) => reject()))
        return rejects(execute(undefined))
      })
      it('define fall retries limit', async function() {
        const { execute, pull, join } = new AtHome({ retries: 10 })
        const id = join()
        Array(10).fill(undefined).forEach(() => pull(id).then(({ reject }) => reject()))
        pull(join()).then(({ resolve }) => resolve(21))
        return assert.strictEqual(await execute(undefined), 21)
      })
      it('define fall retries limit 2', async function() {
        const { execute, pull, join } = new AtHome<any, any>({ retries: 10 })
        const id = join()
        Array(11).fill(undefined).forEach(() => pull(id).then(({ reject }) => reject()))
        return rejects(execute(undefined))
      })
      it('fall pull retries', async function() {
        const { execute, pull, join } = new AtHome()
        pull(join()).then(rej)
        const result = execute(undefined)
        pull(join()).then(res(21))
        return assert.strictEqual(await result, 21)
      })
      it('reject unknow pull', async function() {
        const { pull } = new AtHome()
        return rejects(pull('233'))
      })
      it('quit after execute', async function() {
        const { pull, join, execute, quit } = new AtHome()
        const id = join()
        pull(id).then(res(23))
        const result = await execute(undefined)
        quit(id)
        return assert.strictEqual(result, 23)
      })
    })
    context('Statistics', function() {
      it('home resolves++', async function() {
        const home = new AtHome()
        const id = home.join()
        home.pull(id).then(res(21))
        home.pull(id).then(res(21))
        await home.execute(undefined)
        await home.execute(undefined)
        return assert.strictEqual(home.homes.get(id).resolves, 2)
      })
      it('home rejects++', async function() {
        const home = new AtHome()
        const id = home.join()
        home.pull(id).then(rej)
        home.pull(id).then(rej)
        home.pull(home.join()).then(res())
        await home.execute(undefined)
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('combination', async function() {
        const home = new AtHome<number, number>()
        const id = home.join()
        home.pull(id).then(res())
        home.pull(id).then(rej)
        home.pull(id).then(rej)
        home.pull(home.join()).then(res())
        await home.execute(2)
        await home.execute(0)
        assert.strictEqual(home.homes.get(id).resolves, 1)
        return assert.strictEqual(home.homes.get(id).rejects, 2)
      })
      it('update lastSeen at join', async function() {
        const home = new AtHome<number, number>()
        const now = Date.now()
        const id = home.join()
        return assert.isAtLeast(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen at pull', async function() {
        const home = new AtHome<number, number>()
        const id = home.join()
        const now = home.homes.get(id).lastSeen
        await wait(20)
        home.pull(id)
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen after execute', async function() {
        const home = new AtHome<number, number>()
        const id = home.join()
        home.pull(id).then(res())
        const now = home.homes.get(id).lastSeen
        await wait(20)
        await home.execute(19)
        await wait(1)
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
      it('update lastSeen after execute falls', async function() {
        const home = new AtHome<number, number>({ retries: 0 })
        const id = home.join()
        home.pull(id).then(rej)
        const now = home.homes.get(id).lastSeen
        await wait(20)
        await home.execute(17).catch(() => { })
        return assert.isAbove(home.homes.get(id).lastSeen, now)
      })
    })
    context('other', function() {
      it('string to error', async function() {
        const home = new AtHome<number, number>({ retries: 0 })
        const id = home.join()
        home.pull(id).then(({ reject }) => reject('oh no'))
        const e = await home.execute(17).catch(e => e)
        return assert.strictEqual(e.message, 'oh no')
      })
    })
  })
})
