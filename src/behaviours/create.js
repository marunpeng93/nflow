behaviours.create = (flow, defaults)=>{

  flow.create = (name, ...data) => {
    
    var instance = flow.get(name)
    if (instance){
      instance.data(...data)
      return instance
    }
    instance = create(flow.create.defaults, name, data)
    instance.parent.value = flow
    flow.children.value.push(instance)
    dispatchInternalEvent(flow, 'create', instance)
    return instance
  }

  flow.create.defaults = {
    factory: defaults.factory,
    behaviours: defaults.behaviours.concat(),
    direction: defaults.direction

  }

}