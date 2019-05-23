const uuid = require('uuid/v4')
const Server = require('socket.io')

class AtHome {
  constructor({ id = uuid() } = {}) {
    this.id = id
    this.ability = {}
    this.upstream = {}
    this.downstream = {}
    this.inbounds = {}
    this.outbounds = {}
  }
  connect({ port, type }) {

  }
  checkBusy(name) {
    return Object.keys(this.ability[name].outbounds)
      .map(id => this.ability[name].outbounds[id].busy)
      .reduce((a, b) => a && b)
  }
  open({ port, protocol = 'processer', id = uuid() }) {
    let outbound = new Outbound({ port, protocol, id }, {
      register: name => {
        if (!this.ability[name]) {
          this.ability[name] = { outbounds: {}, busy: false }
        }
        this.ability[name].outbounds[id] = { busy: false }
      },
      busy: name => {
        this.ability[name].outbounds[id].busy = true
        this.ability[name].busy = this.checkBusy(name)
      },
      free: name => {
        this.ability[name].outbounds[id].busy = false
        this.ability[name].busy = this.checkBusy(name)
      }
    })
    this.outbounds[outbound.id] = outbound
  }
}

class Outbound {
  constructor({ port, protocol, id }, { register, busy, free }) {
    this.id = id
    this.ability = {}
    this.port = port
    this.register = register
    this.busy = busy
    this.free = free
    this.protocol = protocol
    if (protocol === 'ws') {
      const io = new Server(port, { serveClient: false })
      this.io = io
    }
  }
}

module.exports = AtHome
