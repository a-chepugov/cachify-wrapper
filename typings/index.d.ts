declare function _default<K, V>(fn: FN, storage?: Storage<K, V>, options?: Options, hasher?: Function): Function;
export default _default;
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
import { FN } from "./Interfaces.js";
import { Storage } from "./Interfaces.js";
