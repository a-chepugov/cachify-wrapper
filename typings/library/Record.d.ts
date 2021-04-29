export default Record;
export type RecordPacked<V> = {
    e?: string;
    v?: V;
    t?: number;
    l?: boolean;
};
/**
 * @ignore
 * @template V
 */
export class Record<V> {
    /**
     * @template V0
     * @param {Error} error
     * @return {Record<V0>}
     */
    static error<V0>(error: Error): Record<V0>;
    /**
     * @template V0
     * @param {V0} value
     * @return {Record<V0>}
     */
    static of<V0_1>(value: V0_1): Record<V0_1>;
    /**
     * @template V0
     * @param {Error} [error]
     * @param {V0} [value]
     * @return {Record<V0>}
     */
    static locked<V0_2>(error?: Error, value?: V0_2): Record<V0_2>;
    /**
     * @template V0
     * @param {RecordPacked<V0>} pack
     * @return {Record<V0>}
     */
    static unpack<V0_3>(pack?: RecordPacked<V0_3>): Record<V0_3>;
    /**
     * @param {Error} value
     */
    set error(arg: Error);
    get error(): Error;
    _error: Error;
    /**
     * @param {V} value
     */
    set value(arg: V);
    get value(): V;
    _value: V;
    /**
     * @param {number} value
     */
    set timestamp(arg: number);
    get timestamp(): number;
    _timestamp: number;
    /**
     * @param {boolean} value
     */
    set lock(arg: boolean);
    get lock(): boolean;
    _lock: boolean;
    pack(): RecordPacked<V>;
}
