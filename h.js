const classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/
const notClassId = RegExp.prototype.test.bind(/^[\.#]/)
const isClass = RegExp.prototype.test.bind(/^\./)
const isId = RegExp.prototype.test.bind(/^\#/)

const parsers = {
  '.': (part, classes, props) => classes.push(part.slice(1)),
  '#': (part, classes, props) => props.id = part.slice(1),
}

export const parseTag = (tag, props) => {
  if (!tag) return 'div'
  const tagParts = tag.split(classIdSplit).filter(Boolean)
  let tagName = tagParts.find(notClassId)
  if (!props) return tagName
  const classes = tagParts.filter(isClass)
  props.id = tagParts.find(isId)
  for (const part of tagParts) {
    if (!tagName) {
      tagName = part
      continue
    }
    const parser = parsers[part[0]]
    parser && parser(part, classes, props)
  }
  
  classes.length && (props.className = props.className
    ? `${props.className} ${classes.join(' ')}`
    : classes.join(' '))
  
  return tagName
}

const isStr = str => typeof str === 'string'
const isTag = tag => isStr(tag) && !tag.includes(' ')
const isChildren = child => child
  && isStr(child)
  || Array.isArray(child)
  || child instanceof Element

const setAttr = (elem, val, key) => elem.setAttribute(key, val)
const setProp = (elem, val, key) => elem[key] = val
const deepAssignProps = (elem, val, key) => Object.assign(elem[key], val)
const assignData = (elem, val) => deepAssignProps(elem, val, 'dataset')
const mergeClass = (elem, val) =>
  elem.classList.add.apply(elem.classList, val.split(' '))

export const injectCss = value => {
  const style = document.createElement('style')
  const className = `h-${Math.random().toString(36).slice(2)}`
  style.innerHTML = value.includes('_')
    ? value.replace(/_/g, className)
    : `.${className} {${value}}`
  document.head.appendChild(style)
  return className
}

const mergeCss = (elem, value) => elem.classList.add(injectCss(value))

const addClass = (props, className) => props.className = props.className
  ? [ ...(new Set(props.className.split(' '))).add(className) ].join(' ')
  : className

// TODO: create handlers for aria
const getHandler = key => {
  switch (key) {
    case 'class':
    case 'className': return mergeClass
    case 'css': return mergeCss
    case 'data':
    case 'dataset': return assignData
    case 'style': return deepAssignProps
    default: return key.indexOf('-') !== -1 ? setAttr : setProp
  }
}

function merger([ key, value ], index, props) {
  return value !== undefined && getHandler(key)(this, value, key, props)
}

function addChild(child) {
  if (child === undefined) return
  if (child instanceof Element) return this.appendChild(child)
  if (Array.isArray(child)) return child.forEach(addChild, this)
  return this.appendChild(document.createTextNode(String(child)))
}

function updateElement(props) {
  props && Object.entries(props).forEach(merger, this)
}

function emptyElement() {
  while (this.lastChild && this.lastChild !== this) {
    this.removeChild(this.lastChild)
  }
}

function replaceChild(child) {
  emptyElement.call(this)
  addChild.call(this, child)
}

const createElement = (tag, props, child) => {
  const elem = document.createElement(tag) // .toLowerCase() ?
  elem.update = updateElement
  elem.add = addChild
  elem.replace = replaceChild 
  elem.update(props)
  elem.add(child)
  return elem
}

const prepareArgs = (tag, props) => {
  if (!isStr(tag)) {
    props = tag
    tag = 'div'
  } else {
    const delim = tag.indexOf('\n')
    if (delim < 0) {
      tag = parseTag(tag, props || (props = {}))
    } else {
      addClass(props || (props = {}), injectCss(tag.slice(delim + 1)))
      tag = parseTag(tag.slice(0, delim), props)
    }
  }
  return { tag, props }
}

export const create = (tag, props, child) => {
  if (isChildren(props)) {
    child = props
    props = undefined
  }
  const prepared = prepareArgs(tag, props)
  return createElement(prepared.tag, prepared.props, child)
}

export const prepare = (rawTag, rawProps) => {
  const { tag, props } = prepareArgs(rawTag, rawProps)
  return (extra, child) => {
    if (isChildren(extra)) {
      child = extra
      extra = undefined
    }
    return createElement(tag, extra ? { ...props, ...extra } : props, child)
  }
}

export const replace = elem => elem && replaceChild.call(elem)
export const empty = elem => elem && emptyElement.call(elem)
export const update = (elem, props) => updateElement.call(elem, props)
export const add = (elem, child) => addChild.call(elem, child)
