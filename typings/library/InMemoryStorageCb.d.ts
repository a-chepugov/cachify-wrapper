export default InMemoryStorageCb;
/**
 * @template K
 * @template V
 * @implements {Storage<K, V>}
 */
export class InMemoryStorageCb<K, V> implements Storage<K, V> {
    /**
     * @ignore
     * @type {InMemoryStorage<K, V>}
     */
    _cache: InMemoryStorage<K, V>;
    /**
     * @param {K} key
     * @param {CB<V>} cb
     */
    get(key: K, cb: CB<V>): any;
    /**
     * @param {K} key
     * @param {V} value
     * @param {number} ttl
     * @param {CB<boolean>} cb
     */
    set(key: K, value: V, ttl: number, cb: CB<boolean>): any;
    /**
     * @param {K} key
     * @param {CB<boolean>} cb
     */
    del(key: K, cb: CB<boolean>): any;
}
import { Storage } from "../Interfaces/Storage";
import InMemoryStorage_1 = require("./InMemoryStorage/Serializable.js");
import InMemoryStorage = InMemoryStorage_1.default;
import { CB } from "../Interfaces/Functions";
