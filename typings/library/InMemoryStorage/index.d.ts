export default InMemoryStorage;
export type KRecordTuple<K, V> = [K, InMemoryStorageRecord<V>];
export type InMemoryStorageRecord<V> = {
    value?: any;
    timestamp?: number;
    ttl?: number;
};
/**
 * @template V
 * @typedef {Object} InMemoryStorageRecord
 * @property {any} [value]
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
    /** @type {Map<K, InMemoryStorageRecord<V>>} */
    data: Map<K, InMemoryStorageRecord<V>>;
    /** @type {Map<K, number>} */
    timers: Map<K, number>;
    /**
     * @param {K} key
     */
    get(key: K): any;
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
    keys(): K[];
    export(): [K, InMemoryStorageRecord<V>][];
    /**
     * @param {Array<KRecordTuple<K, V>>} dump
     */
    import(dump: KRecordTuple<K, V>[]): InMemoryStorage<K, V>;
}
