export default callback;
export function promise<K, V>(fn: Function, storage?: Storage<K, RecordPacked<V>>, options?: Options, hasher?: Function): (...args: any[]) => Promise<any>;
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
 * @param {function} fn - `callback-last` style function
 * @param {Storage<K, RecordPacked<V>>} [storage=InMemoryStorageCb] - cache storage
 * @param {Options} [options={}]
 * @param {Function} [hasher=JSON.stringify] - creates key for KV-storage from `fn` arguments
 * @return {function}
 */
export function callback<K, V>(fn: Function, storage?: Storage<K, RecordPacked<V>>, options?: Options, hasher?: Function): Function;
import { Storage } from "./Interfaces/Storage.js";
import { RecordPacked } from "./library/Record.js";
/**
 * @typedef {Object} Options
 * @property {Object} [storage]
 * @property {number} [storage.timeout=Infinity] - max storage response time before considering it as failed, and invoking `fn`
 * @property {Object} [source]
 * @property {number} [source.timeout=Infinity] - max `fn` response time before considering it as failed
 * @property {number} [expire=1000] - time to consider cached data expired [in milliseconds]
 * @property {number} [spread=expire/1000] - expire time spread (prevents simultaneous deletions saved items from storage)
 * @property {number} [lock=0] - lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
 * @property {number} [stale] - additional ttl for stale data
 * @property {number} [ttl=expire+stale] - forced ttl (TimeToLive) for data (useful if storage is using from multiply services with different expire)
 * @property {number} [retries=1] - number of storage requests passes before `fn` call
 * @property {number} [error] - ttl for erroneous state cache (prevents frequent call of `fn`)
 * @property {boolean} [debug] - debug activation flag
 */
/**
 * @description no cache error
 */
export class CacheAbsentError extends Error {
}
import callbackify_1 = require("./library/callbackify.js");
import callbackify = callbackify_1.default;
import promisify_1 = require("./library/promisify.js");
import promisify = promisify_1.default;
export { Storage, callbackify, promisify };
