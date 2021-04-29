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
class Storage {
	/**
	 * @param {K} key
	 * @param {CB<V>} cb
	 */
	get(key, cb) {
		throw new Error('not implemented');
	};

	/**
	 * @param {K} key
	 * @param {V} value
	 * @param {number} ttl
	 * @param {CB<boolean>} cb
	 */
	set(key, value, ttl, cb) {
		throw new Error('not implemented');
	};

	/**
	 * @param {K} key
	 * @param {CB<boolean>} cb
	 */
	del(key, cb) {
		throw new Error('not implemented');
	};
}

exports.Storage = Storage;
exports.default = Storage;
