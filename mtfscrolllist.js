let G = Object.create(null)
const init = ({ele = null, data = [], render = v => v, perPage = data.length, onTop = () => {}, onBottom = () => {}, onPullDownStart = () => {}, onPullDownMove = () => {}, onPullDownEnd = () => {}}) => {
    G = { ele, render, startIndex: 0, perPage, onTop, onBottom, onPullDownStart, onPullDownMove, onPullDownEnd }
    refresh(data)
    pullDownListener()
}
class cacheHeightStack {
    constructor () {
        this.stack = []
        this.height = 0
    }
    isEmpty() {
        return this.stack.length === 0
    }
    push ({ele, height}) {
        this.height += height || 0
        return this.stack.push({ele, height})
    }
    front () {
        return this.stack[this.stack.length - 1]
    }
    pop () {
        const r = this.stack.pop()
        this.height -= r.height || 0
        return r
    }
}
const Dom = {
    cache: { top: new cacheHeightStack, bottom: new cacheHeightStack },
    paddingTop (top) {
        if (top) G.ele.style.paddingTop = top + 'px'
        if (top === 0) return G.ele.style.removeProperty('padding-top')
        return top || parseInt(G.ele.style.paddingTop) || 0
    },
    firstChildPaddingTop (top) {
        if (top === 0) return G.ele.firstChild.style.removeProperty('padding-top')
        G.ele.firstChild.style.paddingTop = top !== void 0 ? top : Dom.cache.top.height + 'px'
    },
    lastChildPaddingBottom (bottom) {
        if (bottom === 0) return G.ele.lastChild.style.removeProperty('padding-bottom')
        G.ele.lastChild.style.paddingBottom = bottom !== void 0 ? bottom : Dom.cache.bottom.height + 'px'
    },
    height (ele) {
        const styles = ele.currentStyle || window.getComputedStyle(ele)
        return ele.offsetHeight + parseInt(styles['marginTop'] | 0) + parseInt(styles['marginBottom'] | 0)
    },
    prepend (data) {
        const firstChild = G.ele.firstChild 
        data.forEach(data => G.ele.insertBefore(G.render(data, G.startIndex++), firstChild))
    },
    prependFromCache () {
        const firstChild = G.ele.firstChild, prev = Dom.cache.top.pop()
        if (prev) {
            Dom.firstChildPaddingTop(0)
            prev.ele.forEach(ele => G.ele.insertBefore(ele, firstChild))
            Dom.firstChildPaddingTop()
        }
    },
    append (data) {
        data.forEach(data => G.ele.appendChild(G.render(data, G.startIndex++)))
    },
    appendFromCache () {
        const last = Dom.cache.bottom.pop()
        if (last) {
            Dom.lastChildPaddingBottom(0)
            last.ele.forEach(ele => G.ele.appendChild(ele))
            Dom.lastChildPaddingBottom()
        }
    },
    clearTop () {
        if (G.ele.children.length > G.perPage) {
            Dom.firstChildPaddingTop(0)
            let i = -1, ele = Array(G.perPage), height = 0
            while (++i < G.perPage) {
                height += Dom.height(ele[i] = G.ele.children[0])
                G.ele.removeChild(ele[i])
            }
            Dom.cache.top.push({ele, height})
            Dom.firstChildPaddingTop()
        }
    },
    clearBottom () {
        if (G.ele.children.length > G.perPage) {
            Dom.lastChildPaddingBottom(0)
            let i = G.perPage, ele = Array(G.perPage), height = 0
            while (i--) {
                height += Dom.height(ele[i] = G.ele.children[G.ele.children.length - 1])
                G.ele.removeChild(ele[i])
            }
            Dom.cache.bottom.push({ele, height})
            Dom.lastChildPaddingBottom()
        }
    },
    clear () {
        G.ele.innerHTML = ''
    }
}
/**
 * 节流或防抖
 * @param {Function} fn 要节流的函数 
 * @param {Integer} wait 多少毫秒执行一次
 * @param {Boolean} debounce 是否开启防抖
 */
function throttle(fn, wait, debounce) {
    var timer = null
    return function (...args) {
        debounce && timer &&  (clearTimeout(timer) || (timer = null))
        !timer && (timer = setTimeout(() => {
            fn.apply(this, args)
            timer = null
        }, wait))
    }
}
/** 监听滚动事件 */
const scrollListener = () => {
    const topDom = () => {
        Dom.clearBottom()
        if (Dom.cache.top.isEmpty()) {
            const data = G.onTop()
            if (data) Dom.prepend(data)
        } else Dom.prependFromCache()
    }
    const bottomDom = () => {
        Dom.clearTop()
        if (Dom.cache.bottom.isEmpty()) {
            const data = G.onBottom()
            if (data) Dom.append(data)
        } else Dom.appendFromCache()
    }
    if (typeof IntersectionObserver === void 0) {
        const rect = G.ele.getBoundingClientRect()
        G.ele.addEventListener('scroll', throttle(() => {
            const firstChild = G.ele.firstChild, lastChild = G.ele.lastChild,
            rectTop = firstChild.getBoundingClientRect(),
            rectBottom = lastChild.getBoundingClientRect()
            let curFirstChild = null, curLastChild = null
            if (curFirstChild !== firstChild && rectTop.bottom > rect.top) {
                topDom()
                curFirstChild = firstChild
            }
            if (curLastChild !== lastChild && rectBottom.top < rect.bottom) {
                bottomDom()
                curLastChild = lastChild
            }
        }, 60))
    } else {
        const observe = (observer, ele) => {
            if (observer.ele !== ele) {
                observer.disconnect()
                observer.observe(ele)
                observer.ele = ele
            }
        }
        const topObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                topDom()
                observe(topObserver, G.ele.firstChild)
                observe(bottomObserver, G.ele.lastChild)
                
            }
        }, { root: G.ele, threshold: 0 })
        const bottomObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                bottomDom()
                observe(topObserver, G.ele.firstChild)
                observe(bottomObserver, G.ele.lastChild)
                
            }
        }, { root: G.ele, threshold: 0 })
        observe(bottomObserver, G.ele.lastChild)
    }
}

const refresh = (data) => {
    G.startIndex = 0
    Dom.clear()
    Dom.append(data)
    scrollListener()
}
/** requestAnimationFrame兼容 */
const requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (f) {
    window.setTimeout(f, 1000 / 60)
}

/** 下拉刷新 */
const pullDownListener = () => {
    let getY = e => e.targetTouches ? e.targetTouches[0].clientY : e.clientY,
        start = e => {
            startY = getY(e)
            G.onPullDownStart({ startY })
            ;['mousemove', 'touchmove'].forEach(v => G.ele.addEventListener(v, move))
            ;['mouseup', 'touchend'].forEach(v => G.ele.addEventListener(v, end))
        },
        move = e => {
            const paddingTop = getY(e) - startY
            if (G.onPullDownMove({ paddingTop }) === void 0) {
                Dom.paddingTop(paddingTop)
            }
        },
        end = () => {
            ;['mousemove', 'touchmove'].forEach(v => G.ele.removeEventListener(v, move))
            ;['mouseup', 'touchend'].forEach(v => G.ele.removeEventListener(v, end))
            let paddingTop = Dom.paddingTop()
            const data = G.onPullDownEnd({ paddingTop })
            if (data) refresh(data)
            const f = () => {
                const t = Math.max(5, paddingTop / 10)
                if (paddingTop > t) {
                    Dom.paddingTop(paddingTop -= t)
                    requestAnimationFrame(f)
                } else Dom.paddingTop(0)
            }
            requestAnimationFrame(f)
        }, startY = 0
    ;['mousedown', 'touchstart'].forEach(v => G.ele.addEventListener(v, start))
}
export default init