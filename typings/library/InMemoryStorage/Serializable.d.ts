export default InMemoryStorageSerializable;
/**
 * @template K
 * @template V
 * @extends {InMemoryStorage<K, V>}
 */
export class InMemoryStorageSerializable<K, V> extends InMemoryStorage<K, V> {
    /**
     * @return {Iterable<KRecordTuple<K, V>>}
     */
    export(): Iterable<KRecordTuple<K, V>>;
    /**
     * @param {Iterable<KRecordTuple<K, V>>} dump
     */
    import(dump: Iterable<KRecordTuple<K, V>>): InMemoryStorageSerializable<K, V>;
}
import { InMemoryStorage } from "./index.js";
import { KRecordTuple } from "./index.js";
