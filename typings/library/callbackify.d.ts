export default callbackify;
/**
 * @ignore
 * @description Converts promise returning function into `callback-last / error-first` style function
 * @param {function(): Promise<*>} fn
 * @return {function}
 */
declare function callbackify(fn: () => Promise<any>): Function;
