import factory from '../factory'
import logger from '../logger'
import {assert, dispatchInternalEvent} from '../utils'
import { DEFAULTS
       , ERRORS
       , STATUS
       , DIRECTION
       , UNSET } from '../consts'


export default (flow, defaults)=>{

  flow.create = (name, ...data) => {
    var instance = factory(flow.create.defaults, name, data)
    instance.parent.value = flow
    flow.children.value.push(instance)
    inheritStats(instance)
    dispatchInternalEvent(flow, 'create', instance)

    return instance
  }

  flow.create.defaults = {
    factory: defaults.factory,
    behaviours: defaults.behaviours.concat(),
    direction: defaults.direction
  }

  flow.dispose = (...args) => {
    assert(args.length
         , ERRORS.invalidDisposeArgs)
    if (flow.dispose.value === true) return;

    dispatchInternalEvent(flow, 'dispose', true)
    flow.parent(null)
    flow.dispose.value = true
    flow.on.listenerMap = {}

    //recursively dispose all downstream nodes
    flow.children().forEach(f=>f.dispose())
    return flow
  }
  flow.dispose.value = false
}

function inheritStats(flow){
  let p = flow.parent()
  if (p) {
    let defaults = p.stats.value.defaults||{}
    let nodeDefaults = defaults[flow.name.value]||{}
    flow.stats.value = {...nodeDefaults}
  }
}
