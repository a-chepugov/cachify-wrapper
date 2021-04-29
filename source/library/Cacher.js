const {Record, RecordPacked} = require('./Record.js');
const {CB, Storage} = require('../Interfaces.js');

const MAX_TIMEOUT = 2 ** 30;

/**
 * @description no cache error
 */
class NO_CACHE_ERROR extends Error {
}

exports.NO_CACHE_ERROR = NO_CACHE_ERROR;

/**
 * @description cache lock expired error
 */
class CACHE_LOCK_EXPIRED_ERROR extends Error {
}

exports.CACHE_LOCK_EXPIRED_ERROR = CACHE_LOCK_EXPIRED_ERROR;

/**
 * @description cache expired error
 */
class CACHE_EXPIRED_ERROR extends Error {
}

exports.CACHE_EXPIRED_ERROR = CACHE_EXPIRED_ERROR;

/**
 * @typedef {Object} CacherOptions
 * @property {number} [expire]
 * @property {number} [lock]
 * @property {number} [retries]
 */

/**
 * @ignore
 * @template K
 * @template V
 * @param {K} key
 * @param {CB<Record<V>>} cb
 * @param {Storage<K, RecordPacked<V>>} store
 * @param {CacherOptions} options
 * @param {number} retries
 * @param {number} latency
 */
const onGetFactory = (key, cb, store, options, retries, latency) =>
	/**
	 * @param {Error} [error]
	 * @param {RecordPacked<V>} [packed]
	 */
	(error, packed) => {
		// record reading error
		// no record
		// record exists
		// record lock exists and it is fresh and retries > 0
		if (error) {
			return cb(error, null);
		}

		if (packed) {
			const record = Record.unpack(packed);
			if (record.lock) {
				if (retries < options.retries && (record.timestamp + options.lock > Date.now())) {
					setTimeout(() => store.get(key, onGetFactory(key, cb, store, options, retries + 1, latency)), latency);
					return;
				} else {
					return cb(new CACHE_LOCK_EXPIRED_ERROR(String(key)), null);
				}
			} else {
				return cb(null, record);
			}
		}
		return cb(new NO_CACHE_ERROR(String(key)), null);
	};

/**
 * @ignore
 * @template K
 * @template V
 */
class Cacher {
	/**
	 * @param {Storage<K, RecordPacked<V>>} store
	 * @param {CacherOptions} options
	 */
	constructor(store, options = {}) {
		/** @type {Storage<K, RecordPacked<V>>} */
		this._store = store;
		/** @type {CacherOptions} */
		this._options = options;
		this._latency = options.expire > 0 && options.retries > 0 ? Math.ceil(options.expire / options.retries) : 0;
		this._latency = Number.isFinite(this._latency) ? this._latency : MAX_TIMEOUT;
		Object.freeze(this);
	}

	/**
	 * @param {K} key
	 * @param {CB<Record<V>>} cb
	 */
	get(key, cb) {
		const onGet = onGetFactory(key, cb, this._store, this._options, 0, this._latency);
		return this._store.get(key, onGet);
	}

	/**
	 * @param {K} key
	 * @param {Record<V>} record
	 * @param {number} ttl
	 * @param {CB<boolean>} cb
	 */
	set(key, record, ttl, cb) {
		return this._store.set(key, record.pack(), ttl, cb);
	}

	/**
	 * @param {K} key
	 * @param {CB<boolean>} cb
	 */
	del(key, cb) {
		return this._store.del(key, cb);
	}
}

exports.Cacher = Cacher;
exports.default = Cacher;
