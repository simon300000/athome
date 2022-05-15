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
  reject: (error?: Error | string) => void
  promise: Promise<Output>
  constructor(id: HomeID, task: Task<Input, Output>) {
    this.id = id
    this.task = task
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = error => {
        if (!error) {
          reject(new Error())
        } else if (typeof error === 'string') {
          reject(new Error(error))
        } else {
          reject(error)
        }
      }
    })
  }
}

class Home<Input, Output> {
  id: HomeID
  resolves: number
  rejects: number
  lastSeen: number
  jobs: Set<Job<Input, Output>>
  constructor({ id }: { id: HomeID }) {
    this.id = id
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

export class AtHome<Input, Output> {
  homes: Map<HomeID, Home<Input, Output>>
  pulls: Array<Pull<Input, Output>>
  pending: Array<Task<Input, Output>>
  private retries: number
  constructor({ retries = 5 } = {}) {
    this.homes = new Map()
    this.pulls = []
    this.pending = []
    this.retries = retries
  }

  join = ({ id = homeID() } = {}) => {
    this.homes.set(id, new Home({ id }))
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

  private dispatch = (id: HomeID, task: Task<Input, Output>) => {
    const home = this.homes.get(id)
    const job = new Job(id, task)
    home.jobs.add(job)

    job.promise
      .then(result => {
        home.resolves++
        task.resolve(result)
      })
      .catch((e: Error) => {
        home.rejects++
        task.falls.push(e)
        if (task.falls.length > this.retries) {
          task.reject(new Error(task.falls.map(({ message }) => message).join(', ')))
        } else {
          this.allocate(task, true)
        }
      })
      .finally(() => {
        home.jobs.delete(job)
        home.lastSeen = Date.now()
      })

    return { resolve: job.resolve, reject: job.reject, data: task.data }
  }

  private allocate = (task: Task<Input, Output>, unshift = false) => {
    if (this.pulls.length) {
      const pull = this.pulls.shift()
      pull.resolve(task)
      return task.promise
    } else {
      if (unshift) {
        this.pending.unshift(task)
      } else {
        this.pending.push(task)
      }
      return task.promise
    }
  }

  execute = (data: Input) => {
    const task = new Task<Input, Output>(data)
    return this.allocate(task)
  }

  pull = (id: HomeID) => {
    if (this.homes.has(id)) {
      this.homes.get(id).lastSeen = Date.now()
      if (this.pending.length) {
        const task = this.pending.shift()
        return Promise.resolve(this.dispatch(id, task))
      } else {
        const pull = new Pull<Input, Output>(id)
        this.pulls.push(pull)
        return pull.promise.then(task => this.dispatch(pull.id, task))
      }
    } else {
      return Promise.reject(new Error('unknow node'))
    }
  }
}
