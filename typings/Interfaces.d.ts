export default Storage;
export type FN = (...args?: any[]) => any;
export type CB<V> = (error?: Error, value?: V) => any;
/**
 * @callback FN
 * @param {...*} [args]
 * @return {any}
 */
/**
 * @template V
 * @callback CB
 * @param {Error} [error]
 * @param {V} [value]
 * @return {any}
 */
/**
 * @interface
 * @template K
 * @template V
 */
export class Storage<K, V> {
    /**
     * @param {K} key
     * @param {CB<V>} cb
     */
    get(key: K, cb: CB<V>): void;
    /**
     * @param {K} key
     * @param {V} value
     * @param {number} ttl
     * @param {CB<boolean>} cb
     */
    set(key: K, value: V, ttl: number, cb: CB<boolean>): void;
    /**
     * @param {K} key
     * @param {CB<boolean>} cb
     */
    del(key: K, cb: CB<boolean>): void;
}
