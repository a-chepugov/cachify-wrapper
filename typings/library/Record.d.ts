export default Record;
export type RecordPacked<V> = {
    e?: string;
    v?: V;
    t?: number;
    l?: number;
};
/**
 * @ignore
 * @template V
 */
export class Record<V> {
    /**
     * @template V
     * @return {Record<V>}
     */
    static empty<V_1>(): Record<V_1>;
    /**
     * @template V
     * @param {Error} error
     * @return {Record<V>}
     */
    static error<V_2>(error: Error): Record<V_2>;
    /**
     * @template V
     * @param {V} value
     * @return {Record<V>}
     */
    static of<V_3>(value: V_3): Record<V_3>;
    /**
     * @template V
     * @param {RecordPacked<V>} pack
     * @return {Record<V>}
     */
    static unpack<V_4>(pack?: RecordPacked<V_4>): Record<V_4>;
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
     * @param {number} value
     */
    set lock(arg: number);
    get lock(): number;
    _lock: number;
    block(): Record<V>;
    pack(): RecordPacked<V>;
}
