# cachify-wrapper

Wraps a function with a caching layer

## Usage

### callback

Wraps a function with a caching layer

#### Parameters

*   `fn` **function (...any): any** `callback-last` style function
*   `storage` **[Storage](#storage)\<K, [RecordPacked](#recordpacked)\<V>>** cache storage (optional, default `InMemoryStorageCb`)
*   `options` **[Options](#options)**  (optional, default `{}`)
*   `hasher` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** creates key for KV-storage from `fn` arguments (optional, default `JSON.stringify`)

#### Examples

```javascript
const wrapper = require('cachify-wrapper').default;
class Storage {
	constructor() {
		this.data = new Map();
	}
	get = (key, cb) => cb(null, this.data.get(key))
	set = (key, value, ttl, cb) => {
		this.data.set(key, value);
		if (ttl > 0) setTimeout(() => this.data.delete(key), ttl);
		cb(null, true);
	}
	del = (key, cb) => cb(null, this.data.delete(key))
}
const storage = new Storage();
let count = 0;
const inc = (a, cb) => cb(null, count += a);
const cached = wrapper(inc, storage, {expire: 100});
setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 0); // Invokes request
setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 100); // Takes cached result
setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 200); // Invokes second request

cached.set(2, 'manual value', 1000, () =>
	cached.get(2, (_, result) => {
		console.info(result);
		cached.del(2, () =>
			cached.get(2, (_, result) => console.info(result)))
	}));
```

Returns **function (...any): any**

### promise

Wraps an async function with a caching layer

#### Parameters

*   `fn` **function (...any): [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<any>**
*   `storage` **[Storage](#storage)\<K, [RecordPacked](#recordpacked)\<V>>?**
*   `options` **[Options](#options)?**
*   `hasher` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?**

#### Examples

```javascript
const wrapperPromise = require('cachify-wrapper').promise;
let count = 0;
const inc = async(a) => count += a;
const cached = wrapperPromise(inc, storage, {expire: 1000});
const p1 = cached(1).then((payload) => console.info(payload)); // Invokes request
const p2 = p1.then(() => cached(1).then((payload) => console.info(payload))); // Takes cached result
```

Returns **function (...any): [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<any>**

### Options

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `storage` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**

    *   `storage.timeout` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** max storage response time before considering it as failed, and invoking `fn`
*   `source` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**

    *   `source.timeout` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** max `fn` response time before considering it as failed
*   `expire` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** time to consider cached data expired \[in milliseconds]
*   `spread` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** expire time spread (prevents simultaneous deletions saved items from storage)
*   `lock` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
*   `stale` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** additional ttl for stale data
*   `ttl` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** forced ttl (TimeToLive) for data (useful if storage is using from multiply services with different expire)
*   `retries` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** number of storage requests passes before `fn` call
*   `error` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?** ttl for erroneous state cache (prevents frequent call of `fn`)
*   `debug` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** debug activation flag

### Functions

### Storage

storage interface

#### get

##### Parameters

*   `key` **K**
*   `cb` **CB\<V>**

#### set

##### Parameters

*   `key` **K**
*   `value` **V**
*   `ttl` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
*   `cb` **CB<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**

#### del

##### Parameters

*   `key` **K**
*   `cb` **CB<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**

### RecordPacked

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `e` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**
*   `v` **V?**
*   `t` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?**
*   `l` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?**

### InMemoryStorageCb

#### get

##### Parameters

*   `key` **K**
*   `cb` **CB\<V>**

#### set

##### Parameters

*   `key` **K**
*   `value` **V**
*   `ttl` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
*   `cb` **CB<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**

#### del

##### Parameters

*   `key` **K**
*   `cb` **CB<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**

### InMemoryStorageSerializable

**Extends InMemoryStorage**

#### export

Returns **Iterable\<KRecordTuple\<K, V>>**

#### import

##### Parameters

*   `dump` **Iterable\<KRecordTuple\<K, V>>**

### InMemoryStorageRecord

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

#### Properties

*   `value` **V?**
*   `timestamp` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?**
*   `ttl` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)?**

### InMemoryStorage

#### Parameters

*   `source` **Iterable\<KRecordTuple\<K, V>>?**

#### get

##### Parameters

*   `key` **K**

#### set

##### Parameters

*   `key` **K**
*   `value` **V**

#### del

##### Parameters

*   `key` **K**

#### has

##### Parameters

*   `key` **K**

#### expire

##### Parameters

*   `key` **K**
*   `ttl` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**
