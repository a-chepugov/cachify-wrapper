const {CB} = require('../Interfaces/Functions');
const {Storage} = require('../Interfaces/Storage');

const InMemoryStorage = require('./InMemoryStorage/Serializable.js').default;

/**
 * @template K
 * @template V
 * @implements {Storage<K, V>}
 */
class InMemoryStorageCb {
	constructor() {
		/**
		 * @ignore
		 * @type {InMemoryStorage<K, V>}
		 */
		this._cache = new InMemoryStorage();
	}

	/**
	 * @param {K} key
	 * @param {CB<V>} cb
	 */
	get(key, cb) {
		return cb(null, this._cache.get(key));
	}

	/**
	 * @param {K} key
	 * @param {V} value
	 * @param {number} ttl
	 * @param {CB<boolean>} cb
	 */
	set(key, value, ttl, cb) {
		this._cache.set(key, value);
		if (ttl > 0) this._cache.expire(key, ttl);
		return cb(null, true);
	}

	/**
	 * @param {K} key
	 * @param {CB<boolean>} cb
	 */
	del(key, cb) {
		this._cache.del(key);
		return cb(null, true);
	}
}

exports.InMemoryStorageCb = InMemoryStorageCb;
exports.default = InMemoryStorageCb;
