export default callbackify;
/**
 * @ignore
 * @description Converts function into `callback-last / error-first` style function
 * @param {function} fn
 * @return {function}
 */
declare function callbackify(fn: Function): Function;
