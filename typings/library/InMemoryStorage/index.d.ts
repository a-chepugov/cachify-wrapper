export default InMemoryStorage;
export type KRecordTuple<K, V> = [K, InMemoryStorageRecord<V>];
export type InMemoryStorageRecord<V> = {
    value?: V;
    timestamp?: number;
    ttl?: number;
};
/**
 * @template V
 * @typedef {Object} InMemoryStorageRecord
 * @property {V} [value]
 * @property {number} [timestamp]
 * @property {number} [ttl]
 */
/**
 * @template K
 * @template V
 */
export class InMemoryStorage<K, V> {
    /**
     * @template K
     * @template V
     * @typedef {[K, InMemoryStorageRecord<V>]} KRecordTuple
     */
    /**
     * @param {Iterable<KRecordTuple<K, V>>} [source]
     */
    constructor(source?: Iterable<KRecordTuple<K, V>>);
    /**
     * @ignore
     * @type {Map<K, InMemoryStorageRecord<V>>}
     */
    _data: Map<K, InMemoryStorageRecord<V>>;
    /**
     * @ignore
     * @type {Map<K, number>}
     */
    _timers: Map<K, number>;
    /**
     * @param {K} key
     */
    get(key: K): V;
    /**
     * @param {K} key
     * @param {V} value
     */
    set(key: K, value: V): InMemoryStorage<K, V>;
    /**
     * @param {K} key
     */
    del(key: K): InMemoryStorage<K, V>;
    /**
     * @param {K} key
     */
    has(key: K): boolean;
    /**
     * @param {K} key
     * @param {number} ttl
     */
    expire(key: K, ttl: number): InMemoryStorage<K, V>;
    clear(): InMemoryStorage<K, V>;
    keys(): IterableIterator<K>;
}
