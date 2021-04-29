export default timeout;
/**
 * @ignore
 * @description timeout error
 */
export class TimeoutError extends Error {
}
/**
 * @ignore
 * @param {function(...*): *} fn
 * @param {number} delay
 * @return {function(...*): *} - `callback-last` style function
 */
declare function timeout(fn: (...args: any[]) => any, delay: number): (...args: any[]) => any;
