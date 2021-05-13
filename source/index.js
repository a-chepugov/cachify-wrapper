const {CB} = require('./Interfaces/Functions.js');
const {Storage} = require('./Interfaces/Storage.js');
const {Record, RecordPacked} = require('./library/Record.js');
const random = require('./library/random.js').default;
const timeout = require('./library/timeout.js').default;
const {getFactory} = require('./get.js');
const InMemoryStorageCb = require('./library/InMemoryStorageCb.js').InMemoryStorageCb;

const callbackify = require('./library/callbackify.js').default;
const promisify = require('./library/promisify.js').default;

const MAX_TIMEOUT = 2 ** 30;

/**
 * @example
 * const wrapper = require('cachify-wrapper').default;
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
 * @param {function(...*): *} fn - `callback-last` style function
 * @param {Storage<K, RecordPacked<V>>} [storage=InMemoryStorageCb] - cache storage
 * @param {Options} [options={}]
 * @param {Function} [hasher=JSON.stringify] - creates key for KV-storage from `fn` arguments
 * @return {function(...*): *}
 */
const callback = (
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

	let latency = lock > 0 && retries > 0 ? Math.ceil(lock / retries) : 0;
	latency = Number.isFinite(latency) ? latency : MAX_TIMEOUT;

	const errorTTL = error > 0 ? Math.floor(error) : 0;

	/**
	 * @ignore
	 * @ts-ignore
	 */
	hasher = typeof hasher === 'function' ? hasher : JSON.stringify;

	/**
	 * @ignore
	 * @param {...*} args
	 * @return {void}
	 */
	const log = debug ? console.error : new Function();

	fn = Number.isFinite(sourceTimeout) ? timeout(fn, sourceTimeout) : fn;

	const get = Number.isFinite(storageTimeout) ?
		timeout(getFactory(storage, lock, latency, retries), storageTimeout) :
		getFactory(storage, lock, latency, retries);

	const set = Number.isFinite(storageTimeout) ? timeout(storage.set, storageTimeout) : storage.set;

	const del = Number.isFinite(storageTimeout) ? timeout(storage.set, storageTimeout) : storage.del;

	/**
	 * @ignore
	 * @param {...*} args
	 */
	const wrapped = function(...args) {
		/**
		 * @ignore
		 * @type {CB<V>}
		 */
		const cb = args.pop();
		const key = hasher(...args);
		return get(key,
			/**
			 * @ignore
			 * @param {Error} error
			 * @param {Record<V>} record
			 */
			(error, record) => {
				const calculate = () =>
					fn.call(this, ...args,
						/**
						 * @ignore
						 * @param {Error} calculationError
						 * @param {*} value
						 */
						(calculationError, value) => {
							if (calculationError) {
								if (stale && record && !record.error && record.timestamp + expire + stale > Date.now()) {
									return cb(null, record.value);
								} else {
									if (errorTTL) {
										set.call(storage, key, Record.error(calculationError).pack(), errorTTL, log);
									}
									return cb(calculationError);
								}
							} else {
								set.call(storage, key, Record.of(value).pack(), ttl + random(0, spread), log);
								return cb(calculationError, value);
							}
						});

				// record reading error
				// record exists and
				/// it is with fresh data or error lock
				/// it is with outdated, but not too much, data and `stale` mode activated
				/// other variants

				if (error) {
					return (lock) ?
						set.call(storage, key, Record.locked(error).pack(), lock, calculate) :
						calculate();
				} else {
					const now = Date.now();
					if (
						(!record.error && (record.timestamp + expire > now)) ||
						(record.error && (record.timestamp + errorTTL > now))
					) {
						return cb(record.error, record.value);
					} else if (stale && !record.error && record.timestamp + expire + stale > now) {
						return calculate();
					} else {
						return (lock) ?
							set.call(storage, key, Record.locked(record.error, record.value).pack(), lock, calculate) :
							calculate();
					}
				}
			});
	};
	/** @ts-ignore */
	wrapped.get = (...args) => {
		/**
		 * @ignore
		 * @type {CB<V>}
		 */
		const cb = args.pop();
		const key = hasher(...args);

		return get(key,
			/**
			 * @ignore
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
		/**
		 * @ignore
		 * @type {CB<boolean>}
		 */
		const cb = args.pop();
		/**
		 * @ignore
		 * @type {number}
		 */
		const ttl = args.pop();
		/**
		 * @ignore
		 * @type {V}
		 */
		const value = args.pop();
		return set.call(storage, hasher(...args), Record.of(value).pack(), ttl, cb);
	};
	/** @ts-ignore */
	wrapped.del = (...args) => {
		/**
		 * @ignore
		 * @type {CB<boolean>}
		 */
		const cb = args.pop();
		return del.call(storage, hasher(...args), cb);
	};

	return wrapped;
};

exports.callback = callback;
exports.default = callback;

/**
 * @template K
 * @template V
 * @description Wraps an async function with a caching layer
 * @param {function(...*): Promise<*>} fn
 * @param {Storage<K, RecordPacked<V>>} [storage]
 * @param {Options} [options]
 * @param {Function} [hasher]
 * @return {function(...*): Promise<*>}
 * @example
 * const wrapperPromise = require('cachify-wrapper').promise;
 * let count = 0;
 * const inc = async(a) => count += a;
 * const cached = wrapperPromise(inc, storage, {expire: 1000});
 * const p1 = cached(1).then((payload) => console.info(payload)); // Invokes request
 * const p2 = p1.then(() => cached(1).then((payload) => console.info(payload))); // Takes cached result
 */
exports.promise = (fn, storage, options, hasher) =>
	// @ts-ignore
	promisify(callback(callbackify(fn), storage, options, hasher));

/**
 * @typedef {Object} Options
 * @property {Object} [storage]
 * @property {number} [storage.timeout=Infinity] - max storage response time before considering it as failed, and invoking `fn`
 * @property {Object} [source]
 * @property {number} [source.timeout=Infinity] - max `fn` response time before considering it as failed
 * @property {number} [expire=1000] - time to consider cached data expired [in milliseconds]
 * @property {number} [spread=expire/1000] - expire time spread (prevents simultaneous deletions saved items from storage)
 * @property {number} [lock=0] - lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
 * @property {number} [stale] - additional ttl for stale data
 * @property {number} [ttl=expire+stale] - forced ttl (TimeToLive) for data (useful if storage is using from multiply services with different expire)
 * @property {number} [retries=1] - number of storage requests passes before `fn` call
 * @property {number} [error] - ttl for erroneous state cache (prevents frequent call of `fn`)
 * @property {boolean} [debug] - debug activation flag
 */
