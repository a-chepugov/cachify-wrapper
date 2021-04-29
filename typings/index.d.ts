export default callback;
export function promise<K, V>(fn: (...args: any[]) => Promise<any>, storage?: Storage<K, RecordPacked<V>>, options?: Options, hasher?: Function): (...args: any[]) => Promise<any>;
export type Options = {
    storage?: {
        timeout?: number;
    };
    source?: {
        timeout?: number;
    };
    /**
     * - time to consider cached data expired [in milliseconds]
     */
    expire?: number;
    /**
     * - expire time spread (prevents simultaneous deletions saved items from storage)
     */
    spread?: number;
    /**
     * - lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
     */
    lock?: number;
    /**
     * - additional ttl for stale data
     */
    stale?: number;
    /**
     * - forced ttl (TimeToLive) for data (useful if storage is using from multiply services with different expire)
     */
    ttl?: number;
    /**
     * - number of storage requests passes before `fn` call
     */
    retries?: number;
    /**
     * - ttl for erroneous state cache (prevents frequent call of `fn`)
     */
    error?: number;
    /**
     * - debug activation flag
     */
    debug?: boolean;
};
/**
 * @example
 * const wrapper = require('cachify-wrapper').default;
 * class Storage {
 * 	constructor() {
 * 		this.data = new Map();
 * 	}
 * 	get = (key, cb) => cb(null, this.data.get(key))
 * 	set = (key, value, ttl, cb) => {
 * 		this.data.set(key, value);
 * 		if (ttl > 0) setTimeout(() => this.data.delete(key), ttl);
 * 		cb(null, true);
 * 	}
 * 	del = (key, cb) => cb(null, this.data.delete(key))
 * }
 * const storage = new Storage();
 * let count = 0;
 * const inc = (a, cb) => cb(null, count += a);
 * const cached = wrapper(inc, storage, {expire: 100});
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 0); // Invokes request
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 100); // Takes cached result
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 200); // Invokes second request

 * cached.set(2, 'manual value', 1000, () =>
 * 	cached.get(2, (_, result) => {
 * 		console.info(result);
 * 		cached.del(2, () =>
 * 			cached.get(2, (_, result) => console.info(result)))
 * 	}));
 *
 * @description Wraps a function with a caching layer
 * @template K
 * @template V
 * @param {function(...*): *} fn - `callback-last` style function
 * @param {Storage<K, RecordPacked<V>>} [storage=InMemoryStorageCb] - cache storage
 * @param {Options} [options={}]
 * @param {Function} [hasher=JSON.stringify] - creates key for KV-storage from `fn` arguments
 * @return {function(...*): *}
 */
export function callback<K, V>(fn: (...args: any[]) => any, storage?: Storage<K, RecordPacked<V>>, options?: Options, hasher?: Function): (...args: any[]) => any;
import { Storage } from "./Interfaces/Storage.js";
import { RecordPacked } from "./library/Record.js";
