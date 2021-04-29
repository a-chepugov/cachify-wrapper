const {Storage, CB} = require('../Interfaces');

const InMemoryStorage = require('./InMemoryStorage/index.js').InMemoryStorage;

/**
 * @template K
 * @template V
 * @implements {Storage<K, V>}
 */
class InMemoryStorageCb {
	constructor() {
		/** @type {InMemoryStorage<K, V>} */
		this.cache = new InMemoryStorage();
	}

	/**
	 * @param {K} key
	 * @param {CB<V>} cb
	 */
	get(key, cb) {
		return cb(null, this.cache.get(key));
	}

	/**
	 * @param {K} key
	 * @param {V} value
	 * @param {number} ttl
	 * @param {CB<boolean>} cb
	 */
	set(key, value, ttl, cb) {
		this.cache.set(key, value);
		if (ttl > 0) this.cache.expire(key, ttl);
		return cb(null, true);
	}

	/**
	 * @param {K} key
	 * @param {CB<boolean>} cb
	 */
	del(key, cb) {
		this.cache.del(key);
		return cb(null, true);
	}
}

exports.InMemoryStorageCb = InMemoryStorageCb;
exports.default = InMemoryStorageCb;
