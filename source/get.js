const {Record, RecordPacked} = require('./library/Record.js');
const {CB} = require('./Interfaces/Functions.js');
const {Storage} = require('./Interfaces/Storage.js');

/**
 * @ignore
 * @description no cache error
 */
class NoCacheError extends Error {
}

exports.NoCacheError = NoCacheError;

/**
 * @ignore
 * @description cache lock expired error
 */
class CacheLockExpiredError extends Error {
}

exports.CacheLockExpiredError = CacheLockExpiredError;

/**
 * @ignore
 * @template K
 * @template V
 * @param {Storage<K, RecordPacked<V>>} storage
 * @param {number} lock
 * @param {number} latency
 * @param {number} retries
 * @param {K} key
 * @param {CB<Record<V>>} cb
 */
const onGetWithLocksFactory = (storage, lock, latency, retries, key, cb) =>
	/**
	 * @ignore
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
				if (lock && retries > 0 && (record.lock + lock > Date.now())) {
					setTimeout(() => storage.get(key, onGetWithLocksFactory(storage, lock, latency, retries - 1, key, cb)), latency);
					return;
				} else {
					return cb(new CacheLockExpiredError(String(key)), record);
				}
			} else {
				return cb(null, record);
			}
		}
		return cb(new NoCacheError(String(key)), null);
	};

/**
 * @ignore
 * @template K
 * @template V
 * @param {Storage<K, RecordPacked<V>>} storage
 * @param {number} lock
 * @param {number} latency
 * @param {number} retries
 */
const getFactory = (storage, lock, latency, retries) => {
	/**
	 * @ignore
	 * @param {K} key
	 * @param {CB<Record<V>>} cb
	 */
	const get = (key, cb) => storage.get(key, onGetWithLocksFactory(storage, lock, latency, retries, key, cb));

	return get;
};

exports.getFactory = getFactory;
exports.default = getFactory;
