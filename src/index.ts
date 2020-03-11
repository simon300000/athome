import { v4 as uuidv4 } from 'uuid'
interface HomeID extends String { }

type LikePromise<T> = T | PromiseLike<T>

const uuid = () => String(uuidv4())
const homeID = (): HomeID => uuid()

class Task<Input, Output> {
  data: Input
  id: string
  promise: Promise<Output>
  resolve: (result: Output) => void
  reject: (error: Error) => void
  falls: Array<Error>
  constructor(data: Input) {
    this.falls = []
    this.data = data
    this.id = uuid()
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Job<Input, Output> {
  id: HomeID
  task: Task<Input, Output>
  resolve: (result: Output) => void
  reject: (error: Error) => void
  promise: Promise<Output>
  constructor(id: HomeID, task: Task<Input, Output>) {
    this.id = id
    this.task = task
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

class Home<Input, Output> {
  id: HomeID
  processer: (data: Input) => LikePromise<Output>
  resolves: number
  rejects: number
  lastSeen: number
  jobs: Set<Job<Input, Output>>
  constructor({ processer, id }: { id: HomeID, processer: (data: Input) => LikePromise<Output> }) {
    this.id = id
    this.processer = processer
    this.resolves = 0
    this.rejects = 0
    this.jobs = new Set()
  }
}

class Pull<Input, Output> {
  id: HomeID
  promise: Promise<Task<Input, Output>>
  resolve: (task: Task<Input, Output>) => void
  constructor(id: HomeID) {
    this.id = id
    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })
  }
}

export = class AtHome<Input, Output> {
  homes: Map<HomeID, Home<Input, Output>>
  private validator: (result: Output) => LikePromise<boolean>
  pulls: Array<Pull<Input, Output>>
  pending: Array<Task<Input, Output>>
  private retries: number
  constructor({ validator = (result: Output): LikePromise<boolean> => true, retries = 5 } = {}) {
    this.homes = new Map()
    this.validator = validator
    this.pulls = []
    this.pending = []
    this.retries = retries
  }

  join = (processer: (data: Input) => LikePromise<Output>, { id = homeID() } = {}) => {
    this.homes.set(id, new Home({ processer, id }))
    this.homes.get(id).lastSeen = Date.now()
    return id
  }

  quit = (id: HomeID) => {
    const { jobs } = this.homes.get(id)
    // this.busy = this.busy.filter(node => node !== id)
    this.pulls = this.pulls.filter(pull => pull.id !== id)
    jobs.forEach(({ reject }) => reject(new Error('quit')))
    this.homes.delete(id)
  }

  private transmit = async (id: HomeID, job: Job<Input, Output>) => {
    const home = this.homes.get(id)
    if (!home) {
      throw new Error('unknow home')
    }
    home.jobs.add(job)
    const result = await home.processer(job.task.data)
    this.homes.get(id).lastSeen = Date.now()
    const valid = await this.validator(result)
    if (!valid) {
      throw new Error('invalid')
    }
    return result
  }

  private dispatch = (id: HomeID, task: Task<Input, Output>) => {
    const home = this.homes.get(id)
    const job = new Job(id, task)
    this.transmit(id, job)
      .then(job.resolve)
      .catch(job.reject)
    job.promise
      .then(result => {
        home.resolves++
        task.resolve(result)
      })
      .catch((e: Error) => {
        if (home) {
          home.rejects++
        }
        task.falls.push(e)
        if (task.falls.length > this.retries) {
          task.reject(new Error(task.falls.map(({ message }) => message).join(', ')))
        } else {
          if (this.pulls.length) {
            const pull = this.pulls.shift()
            pull.resolve(task)
          } else {
            this.pending.unshift(task)
          }
        }
      })
      .finally(() => {
        if (home) {
          home.jobs.delete(job)
        }
      })
  }

  execute = (data: Input) => {
    const task = new Task<Input, Output>(data)
    if (this.pulls.length) {
      const pull = this.pulls.shift()
      pull.resolve(task)
      return task.promise
    } else {
      this.pending.push(task)
      return task.promise
    }
  }

  pull = (id: HomeID) => {
    if (this.homes.has(id)) {
      const pull = new Pull<Input, Output>(id)
      this.homes.get(id).lastSeen = Date.now()
      if (this.pending.length) {
        const task = this.pending.shift()
        pull.resolve(task)
      } else {
        this.pulls.push(pull)
      }
      return pull.promise.then(task => this.dispatch(pull.id, task))
    } else {
      return Promise.reject(new Error('unknow node'))
    }
  }
}
