export default promisify;
/**
 * @ignore
 * @param {function} fn - `callback-last / error-first` style function
 * @return {function(): Promise<*>}
 */
declare function promisify(fn: Function): () => Promise<any>;
