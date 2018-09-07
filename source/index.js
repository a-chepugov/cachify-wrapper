'use strict';

const Record = require('./Record');
const sleep = require('../helpers/Standard/Promise/sleep');

const promisify = require('../helpers/Standard/Promise/promisify');
const promiseTimeout = require('../helpers/Standard/Promise/timeout');
const random = require('../helpers/Standard/Number/random');

/**
 * Wraps a function with a caching layer
 * @name cachify-wrapper
 * @param {Function} fn
 * @param {Object} cache - KVStorage interface [must provide set(key, value, expired) and get(key) methods]
 * @param {Object} [options]
 * @param {Number|Object} [options.expire] - key expire options
 * @param {Number} [options.expire.ttl=1000] - cached data ttl (TimeToLive) [in milliseconds]
 * @param {Number} [options.expire.deviation=options.expire.ttl/100] - `ttl` deviation (prevent simultaneous keys deletions) [in milliseconds]
 * @param {Number} [options.lock=1000] - lock timeout [in milliseconds]
 * @param {Boolean|Object} [options.stale] - allow to use a stale data
 * @param {Number} [options.stale.lock=options.lock.timeout] - lock timeout for updating stale data [in milliseconds]
 * @param {Function} [options.hasher=JSON.stringify] - creates key for KV-storage by `fn` arguments
 * @param {Number} [options.timeout] - max cache response time (in milliseconds) before considering it as disabled, and invoking actual request to source
 * @param {Number} [options.latency=options.lock.timeout] - expected source response time  [in milliseconds]. With `options.retries` affect on awaiting for duplicate requests for first request result
 * @param {Number} [options.retries=(options.lock.timeout/options.latency)+1] - number of passes before new actual request
 * @param {*} thisArg - context for `fn` and `options.hasher`
 * @return {Function} wrapped function
 * @example
 * const wrapper = require('cachify-wrapper');
 * const redis = require('redis');
 * class RedisCache {
 *  constructor() {
 *   this.client = redis.createClient();
 *  }
 *  set (key, value, expire) {
 *   return new Promise((resolve, reject) => this.client.set(key, JSON.stringify(value), (error, value) => error ? reject(error) :
 *     expire ? this.client.pexpire(key, expire, (error) => error ? reject(error) : resolve(value)) :
 *     resolve(value)));
 *  }
 *  get (key) {
 *   return new Promise((resolve, reject) => this.client.get(key, (error, value) => error ? reject(error) : resolve(JSON.parse(value))));
 *  }
 * }
 * const cache = new RedisCache();
 * const sourceFunc = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
 * const options = {expire: {ttl: 500}, lock: {timeout: 100}, latency: 100, retries: 1};
 * const cached = wrapper(sourceFunc, cache, options);
 * cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})); // Invoke new request
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 200); // Will get cached result
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 50); // Will invoke new actual request (because of low retries & latency options it can't wait for first invoke cache)
 */
module.exports = function (fn, cache, {expire: {ttl, deviation} = {}, expire, lock, stale: {lock: staleLock} = {}, stale, hasher, timeout, latency, retries} = {}, thisArg) {
	ttl =
		Number.isFinite(expire) && expire > 0 ?
			Math.floor(expire) :
			ttl ?
				ttl > 0 ?
					Math.floor(ttl) :
					1 :
				1000;

	deviation = Number.isFinite(deviation) && deviation > 0 ? Math.floor(deviation) : Math.floor(ttl / 100);

	lock = Number.isFinite(lock) && lock > 0 ? Math.floor(lock) : 1000;

	latency = Number.isFinite(latency) && latency > 0 ? Math.floor(latency) : lock;
	retries = Number.isFinite(retries) && retries > 0 ? Math.floor(retries) : Math.floor(lock / latency) + 1;

	staleLock = staleLock && Number.isFinite(staleLock) && staleLock > 0 ? Math.floor(staleLock) : lock;

	timeout = Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : undefined;

	hasher = hasher ?
		hasher :
		function () {
			return JSON.stringify(arguments);
		};

	const promisifiedFN = promisify(fn, thisArg);

	const cacheSet = promisify(cache.set, cache);
	const cacheGet_ = promisify(cache.get, cache);

	const cacheGet = timeout ?
		(key) => promiseTimeout(cacheGet_(key).catch(console.error), timeout, new Error('Cache read timeout')) :
		(key) => cacheGet_(key).catch(console.error);

	const cacheLock = (key) => cacheSet(key, Record.lock(Date.now()), lock).catch(console.error);

	const cacheLockStale = (key, record) => {
		record.stale = Date.now();
		return cacheSet(key, record);
	};

	const saveValue = (stale || ttl === Infinity) ?
		(key, value) => cacheSet(key, Record.of(value, Date.now())).catch(console.error) :
		(key, value) => cacheSet(key, Record.of(value, Date.now()), Math.floor(ttl + random(0, deviation))).catch(console.error);

	const getCached = async (key) => {
		for (let i = 0; i < retries; i++) {
			const cached = await cacheGet(key);
			if (cached) {
				const record = Record.from(cached);
				if (record.isLocked()) {
					if ((record.lock + lock) > Date.now()) {
						await sleep(latency);
					} else {
						throw new Error(`Lock stuck: ${key}`);
					}
				} else {
					if (Date.now() < (record.timestamp + ttl) || stale) {
						return record;
					} else {
						throw new Error(`Expired data stuck: ${key}`);
					}
				}
			} else {
				break;
			}
		}
		throw new Error(`Cache read locked: ${key}`);
	};

	const returnRecord = stale ?
		(record, key) => {
			if (
				(record.timestamp && (Date.now() > (record.timestamp + ttl))) &&
				(!record.stale || (Date.now() > (record.stale + staleLock))) // stale mark is not setted or outdated
			) {
				cacheLockStale(key, record);
				promisifiedFN.apply(thisArg, arguments).then((value) => saveValue(key, value));
			}
			return record.value;
		} :
		(record) => record.value;

	return function () {
		const key = hasher.apply(thisArg, arguments);
		return getCached(key)
			.catch(() => {
				cacheLock(key);
				return promisifiedFN.apply(thisArg, arguments)
					.then((value) => {
						saveValue(key, value);
						return Record.of(value);
					});
			})
			.then((record) => returnRecord(record, key));
	};
};
