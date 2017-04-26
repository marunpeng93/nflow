import { assert,
  detach,
  isFlow,
  dispatchInternalEvent,
  invalidateListenerCache,
  createMatcher } from '../utils'
import { ERRORS } from '../consts'

export default (flow) => {
  /**
   * Return the immediate child nodes of the current node.
   * **Getter only.**
   *
   * To create new child nodes, use the {@link flow.create} API.
   * To reparent existing nodes, use the {@link flow.parent} API.
   * > **Note:**
   * > Note: this API only returns the immediate children of the current node.
   * > To get all downstream nodes recursively, use the {@link flow.children.all} API.
   * @see flow.parent
   * @see flow.create
   * @readonly
   * @return {flow[]} children - Array of child nodes
   * @example
   * let a = nflow.create('a')
   *
   * let x = a.create('x')
   * let y = a.create('y')
   * let z = a.create('z')
   *
   * nflow.children() // -> [ a ]
   * a.children() // -> [ x, y, z ]
   */
  flow.children = (...args) => {
    assert(args.length, ERRORS.invalidChildren)
    return flow.children.value.concat()
  }
  flow.children.value = []

  /**
   * Check if the given node exists.
   * @alias children.has
   * @memberof flow
   * @param  {(String|Function|RegEx|flow)} matcher Matcher expression:
   *   ```
   *   // function:
   *   .has(node => node.data() === 5)
   *
   *   // string:
   *   .has('foo')
   *
   *   // regex
   *   .has(/$foo[a-Z]*^/)
   *
   *   // flow
   *   .has(flowInstance)
   *   ```
   * @param  {Boolean}  [recursive=true] recursive search or immediate children only.
   * @return {Boolean} `true` if the matcher finds at least one node, else `false`.
   */
  flow.children.has = (matcher, recursive = true) => flow.children.find(matcher, recursive) !== undefined

  /**
   * Find a `downstream` node
   * > **Aliases:**
   * > - `.find`
   * > - `.children.get`
   * > - `.children.find`
   * @alias get
   * @memberof flow
   * @param  {(String|Function|RegEx|flow)} matcher Matcher expression:
   *   ```
   *   // function:
   *   .get(node => node.data() === 5)
   *
   *   // string:
   *   .get('foo')
   *
   *   // regex
   *   .get(/$foo[a-Z]*^/)
   *
   *   // flow
   *   .get(flowInstance)
   *   ```
   * @param  {Boolean}  [recursive=true] recursive search or immediate children only.
   * @return {flow|undefined} The first child node that matches the filter criteria, else `undefined`
   * @example
   * let a = nflow.create('a')
   * let b = nflow.create('b')
   * let x = a.create('x').data(55)
   * let y = a.create('y').data('foo')
   *
   * a.get('x').data() // -> 55
   * b.get('x') // -> null
   * a.get(f=>f.data()==='foo') // -> y
   */
  flow.get = (matcher, recursive = true) => flow.children.find.all(matcher, recursive).pop()
  /**
   * Alias for {@link flow.get}
   * @memberof flow
   * @method
   */
  flow.find = flow.get
  flow.children.find = flow.get

  /**
   * Find all child nodes based on a search criteria.
   *
   * > **Aliases:**
   * > - `children.find.all`
   * > - `children.findAll` (DEPRECATED)
   * @alias get.all
   * @memberof flow
   * @param  {(String|Function|RegEx|flow)} matcher Matcher expression:
   *   ```
   *   // function:
   *   .children.get.all(node => node.data() === 5)
   *
   *   // string:
   *   .children.get.all('foo')
   *
   *   // regex
   *   .children.get.all(/$foo[a-Z]*^/)
   *
   *   // flow
   *   .children.get.all(flowInstance)
   *   ```
   * @param  {Boolean}  [recursive=true] recursive search or immediate children only.
   * @return {flow[]} All child nodes that match the filter criteria
   */
  flow.children.find.all = (matcher, recursive) => {
    let filter = createMatcher(matcher)
    var children = recursive
      ? flow.children.all()
      : flow.children.value
    return children.filter(filter)
  }

  flow.children.findAll = flow.children.find.all
  flow.get.all = flow.children.find.all
  flow.getAll = flow.children.findAll

  /**
   * Return all child nodes recursively, using **Breadth First** traversal.
   *
   * @alias children.all
   * @memberof flow
   * @return {flow[]} All child nodes of the current node (recursive)
   * @example
   * let a = nflow.create('a')
   * let w = a.create('w')
   * let x = a.create('x')
   *
   * let b = nflow.create('b')
   * let y = b.create('y')
   * let z = b.create('z')
   *
   * nflow.children.all() // -> [ a, b, w, x, y, z ]
   */
  flow.children.all = (...args) => {
    assert(args.length, ERRORS.invalidChildren)
    var childMap = {}
    return getChildren(flow)

    function getChildren (flow) {
      if (childMap[flow.guid()]) return []
      childMap[flow.guid()] = true
      var c = flow.children.value
      var gc = flow.children.value.map(getChildren)

      return c.concat.apply(c, gc)
    }
  }
  /**
   * Get or set the the parent of the current node.
   *
   * @example <caption>Reparenting:</caption>
   * let a = nflow.create('a')
   * let b = nflow.create('b')
   * let x = a.create('x')
   *
   * x.parent(b) // reparent a onto b
   *
   * @example <caption>Unparenting: You can create a new standalone tree by setting the parent to null:</caption>
   * let a = nflow.create('a')
   * a.create('x')
   * a.create('y')
   * let b = nflow.create('b')
   *
   * a.parent(null) // unparent `a` to form a new tree
   *
   * @param {(flow|null)} [parent] - the new parent node
   * @returns {flow|null}
   * (setter) The current flow node if a `parent` argument was given.
   * (getter) The parent node of the current flow node if no arguments were given.
   * (getter) `null` if no arguments were given and the current node has no parent.
   * @emits 'flow.parent'
   * @emits 'flow.parent.parent'
   * @emits 'flow.children.parent'
   * @emits 'flow.parented'
   * @emits 'flow.parent.parented'
   * @emits 'flow.children.parented'
   */
  flow.parent = (...parentArgs) => {
    // TODO: accept an index parameter for attaching the flow node as the nth child
    if (!parentArgs.length) return flow.parent.value
    var parent = parentArgs[0]
    parent && assert(!isFlow(parent), ERRORS.invalidParent, parent)
    var previousParent = flow.parent()
    detach(flow)
    /**
     *
     * Dispatched when a node is about to be reparented.
     * @event 'flow.parent'
     * @property {flow} flow - the node to be reparented.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    /**
     *
     * Dispatched when one of the node's parents is about to be reparented.
     * @event 'flow.parent.parent'
     * @property {flow} flow - the node to be reparented.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    /**
     *
     * Dispatched when one of the node's children(recursive) is about to be reparented.
     * @event 'flow.children.parent'
     * @property {flow} flow - the node to be reparented.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    dispatchInternalEvent(flow, 'parent', parent, previousParent)
    attach(parent)
    /**
     *
     * Dispatched when a node has been reparented.
     * @event 'flow.parented'
     * @property {flow} flow - the reparented node.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    /**
     *
     * Dispatched when one of the node's parents has been reparented.
     * @event 'flow.parent.parented'
     * @property {flow} flow - the reparented node.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    /**
     *
     * Dispatched when one of the node's children(recursive) has been reparented.
     * @event 'flow.children.parented'
     * @property {flow} flow - the reparented node.
     * @property {flow} newParent - the the new parent node
     * @property {flow} oldParent - the the old parent node
     * @see flow.parent
     */
    dispatchInternalEvent(flow, 'parented', parent, previousParent)
    return flow
  }

  /**
   * Return an array of all parent nodes, starting from the elements parent, going upstream until a root node is found.
   * @returns {flow[]} All parent nodes starting from the immediate parent to the root
   * @example
   * let a = nflow.create('a')
   * let x = a.create('x')
   * let y = a.create('y')
   * let b = nflow.create('b').parent(null)
   * let z = b.create('z')
   *
   * x.parents() // -> [a, nflow]
   * z.parents() // -> [b]
   */
  flow.parents = (...args) => {
    let parentMap = {}
    parentMap[flow.guid.value] = true
    let parents = []
    let p = flow.parent.value
    while (p && !parentMap[p.guid.value]) {
      parents.push(p)
      parentMap[p.guid.value] = true
      p = p.parent.value
    }
    return parents
  }

  /**
   * Find a parent node based on a search criteria.
   *
   * > **Aliases:**
   * > - `parents.find`
   * @alias parents.get
   * @memberof flow
   * @param  {(String|Function|RegEx|flow)} matcher Matcher expression:
   *   ```
   *   // function:
   *   .parents.get(node => node.data() === 5)
   *
   *   // string:
   *   .parents.get('foo')
   *
   *   // regex
   *   .parents.get(/$foo[a-Z]*^/)
   *
   *   // flow
   *   .parents.get(flowInstance)
   *   ```
   * @return {flow|undefined} The nearest parent node that matches the criteria, else `undefined`
   * @example
   * let a = nflow.create('a').data(55)
   * let b = a.create('b').data({foo:'bar'})
   * let c = b.create('c')
   *
   * c.parents.get('b') // -> b
   * c.parents.get( f=>f.data() === 55 ) // -> a
   */
  flow.parents.find = (matcher) => {
    if (matcher === null) return null
    let filter = createMatcher(matcher)
    return flow.parents()
      .filter(filter)
      .pop()
  }
  flow.parents.get = flow.parents.find

  /**
   * Check if the given parent node exists.
   * @alias parents.has
   * @memberof flow
   * @param  {(String|Function|RegEx|flow)} matcher Matcher expression:
   *   ```
   *   // function:
   *   .parents.has(node => node.data() === 5)
   *
   *   // string:
   *   .parents.has('foo')
   *
   *   // regex
   *   .parents.has(/$foo[a-Z]*^/)
   *
   *   // flow
   *   .parents.has(flowInstance)
   *   ```
   * @return {Boolean} `true` if the matcher finds at least one node, else `false`.
   */
  flow.parents.has = (matcher) => (
    !!flow.parents.find(matcher)
  )

  /**
   * Return the last node in the parent chain, ie. the node that has no further parents.
   * @alias parents.root
   * @memberof flow
   * @return {flow|undefined} The root node if the current node has at least one parent, else `undefined`
   */
  flow.parents.root = (...args) => {
    assert(args.length, ERRORS.invalidRoot)
    return flow
      .parents()
      .pop()
  }

  /**
   * @internal
   */
  flow.children.detach = (child) => {
    flow.children.value =
      flow.children.value
        .filter(f => f !== child)
    invalidateListenerCache(flow)
  }

  flow.target = flow

  function attach (parent) {
    flow.parent.value = parent
    if (parent) {
      parent.children.value.push(flow)
      invalidateListenerCache(parent)
    }
  }
}
