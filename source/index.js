const {FN, CB, Storage} = require('./Interfaces.js');
const {Record} = require('./library/Record.js');
const random = require('./library/random.js').default;
const {timeout, TIMEOUT_ERROR} = require('./library/timeout.js');
const {Cacher, NO_CACHE_ERROR, CACHE_LOCK_EXPIRED_ERROR} = require('./library/Cacher.js');
const InMemoryStorageCb = require('./library/InMemoryStorageCb.js').InMemoryStorageCb;

/**
 * @example
 * const wrapper = require('cachify-wrapper');
 * class Storage {
 * 	constructor() {
 * 		this.data = new Map();
 * 	}
 * 	get = (key, cb) => cb(null, this.data.get(key))
 * 	set = (key, value, ttl, cb) => {
 * 		this.data.set(key, value);
 * 		if (ttl > 0) setTimeout(() => this.data.delete(key), ttl);
 * 		cb(null, true);
 * 	}
 * 	del = (key, cb) => cb(null, this.data.delete(key))
 * }
 * const storage = new Storage();
 * let count = 0;
 * const inc = (a, cb) => cb(null, count += a);
 * const cached = wrapper(inc, storage, {expire: 100});
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 0); // Invokes request
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 100); // Takes cached result
 * setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 200); // Invokes second request

 * cached.set(2, 'manual value', 1000, () =>
 * 	cached.get(2, (_, result) => {
 * 		console.info(result);
 * 		cached.del(2, () =>
 * 			cached.get(2, (_, result) => console.info(result)))
 * 	}));
 *
 * @description Wraps a function with a caching layer
 * @template K
 * @template V
 * @param {FN} fn - source of data (callback-last style function)
 * @param {Storage<K, V>} [storage=InMemoryStorageWrapper] - cache storage
 * @param {Options} [options={}]
 * @param {Function} [hasher=JSON.stringify] - creates key for KV-storage from `fn` arguments
 * @return {Function} wrapped `fn`
 */
exports.default = (
	fn,
	storage = new InMemoryStorageCb(),
	options = {},
	hasher,
) => {
	let {
		source: sourceConfig = {},
		storage: storageConfig = {},
		expire,
		spread,
		lock,
		retries,
		stale,
		ttl,
		error,
		debug,
	} = options;

	const storageTimeout = storageConfig.timeout > 0 ? Math.floor(storageConfig.timeout) : Infinity;
	const sourceTimeout = sourceConfig.timeout > 0 ? Math.floor(sourceConfig.timeout) : Infinity;

	expire = expire > 0 ? Math.floor(expire) : 1000;
	spread = spread > 0 ? Math.floor(spread) : Math.floor(expire / 1000);
	lock = lock > 0 ? Math.floor(lock) : 0;
	retries = retries > 0 ? Math.floor(retries) : 1;
	stale = stale > 0 ? Math.floor(stale) : 0;
	ttl = ttl > (expire + stale) ? Math.floor(ttl) : (expire + stale);

	const errorTTL = error > 0 ? Math.floor(error) : 0;

	/** @ts-ignore */
	hasher = typeof hasher === 'function' ? hasher : (...args) => JSON.stringify(args);

	const log = debug ?
		console.error :
		/**
		 * @ignore
		 * @param {...*} [args]
		 * @return {undefined}
		 */
		(...args) => undefined;

	const cacher = new Cacher(storage, {expire, lock, retries});

	fn = Number.isFinite(sourceTimeout) ? timeout(fn, sourceTimeout) : fn;

	const get = Number.isFinite(storageTimeout) ?
		timeout(cacher.get.bind(cacher), storageTimeout) :
		cacher.get.bind(cacher);

	const set = Number.isFinite(storageTimeout) ?
		timeout(cacher.set.bind(cacher), storageTimeout) :
		cacher.set.bind(cacher);

	/**
	 * @ignore
	 * @param {...*} [args]
	 */
	const wrapped = function(...args) {
		/** @type {CB<V>} */
		const cb = args.pop();
		const key = hasher(...args);
		/** @ts-ignore */
		return get(key, (error, record) => {
			const calculate = () =>
				fn.call(this, ...args,
					/**
					 * @param {Error} calculationError
					 * @param {*} value
					 */
					(calculationError, value) => {
						if (calculationError) {
							if (stale && record && !record.error && record.timestamp + expire + stale > Date.now()) {
								return cb(null, record.value);
							} else {
								if (errorTTL) {
									cacher.set(key, Record.error(calculationError), errorTTL, log);
								}
								return cb(calculationError);
							}
						} else {
							cacher.set(key, Record.of(value), ttl + random(0, spread), log);
							return cb(calculationError, value);
						}
					});

			// record reading error
			// record exists and
			/// it is with fresh data or error lock
			/// it is with outdated, but not too much, data and `stale` mode activated
			/// other variants

			if (error) {
				return cacher.set(key, Record.locked(), lock, calculate);
			} else {
				const now = Date.now();
				if (
					(!record.error && (record.timestamp + options.expire > now)) ||
					(record.error && (record.timestamp + errorTTL > now))
				) {
					return record.error ? cb(record.error, record.value) : cb(error, record.value);
				} else if (stale && !record.error && record.timestamp + expire + stale > now) {
					return calculate();
				} else {
					return cacher.set(key, Record.locked(record.error, record.value), lock, calculate);
				}
			}
		});
	};
	/** @ts-ignore */
	wrapped.get = (...args) => {
		/** @type {CB<V>} */
		const cb = args.pop();
		const key = hasher(...args);

		return get(key,
			/**
			 * @param {Error} error
			 * @param {Record<V>} record
			 */
			(error, record) => {
				if (error) {
					return cb(error);
				} else {
					return cb(record.error, record.value);
				}
			});
	};
	/** @ts-ignore */
	wrapped.set = (...args) => {
		/** @type {CB<boolean>} */
		const cb = args.pop();
		/** @type {number} */
		const ttl = args.pop();
		/** @type {V} */
		const value = args.pop();
		return set(hasher(...args), Record.of(value), ttl, cb);
	};
	/** @ts-ignore */
	wrapped.del = (...args) => {
		/** @type {CB<boolean>} */
		const cb = args.pop();
		return cacher.del(hasher(...args), cb);
	};

	return wrapped;
};

/**
 * @typedef {Object} Options
 * @property {Object} [storage]
 * @property {number} [storage.timeout=Infinity] - max storage response time before considering it as failed, and invoking `fn`
 * @property {Object} [source]
 * @property {number} [source.timeout=Infinity] - max `fn` response time before considering it as failed
 * @property {number} [expire=1000] - time to consider cached data expired [in milliseconds]
 * @property {number} [spread=expire/1000] - expire time spread (prevents simultaneous deletions saved items from storage)
 * @property {number} [lock=source.latency] - lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
 * @property {number} [stale] - additional ttl for stale data
 * @property {number} [ttl=expire+stale] - forced ttl (TimeToLive) for data (useful if storage is using from multiply services with different expire)
 * @property {number} [retries=1] - number of storage requests passes before `fn` call
 * @property {number} [error] - ttl for erroneous state cache (prevents frequent call of `fn`)
 * @property {boolean} [debug] - debug activation flag
 */
