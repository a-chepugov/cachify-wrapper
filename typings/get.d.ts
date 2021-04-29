export default getFactory;
/**
 * @ignore
 * @description no cache error
 */
export class NoCacheError extends Error {
}
/**
 * @ignore
 * @description cache lock expired error
 */
export class CacheLockExpiredError extends Error {
}
/**
 * @ignore
 * @template K
 * @template V
 * @param {Storage<K, RecordPacked<V>>} storage
 * @param {number} lock
 * @param {number} latency
 * @param {number} retries
 */
export function getFactory<K, V>(storage: Storage<K, RecordPacked<V>>, lock: number, latency: number, retries: number): (key: K, cb: CB<Record<V>>) => void;
import { Storage } from "./Interfaces/Storage.js";
import { RecordPacked } from "./library/Record.js";
import { CB } from "./Interfaces/Functions.js";
import { Record } from "./library/Record.js";
