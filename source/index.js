'use strict';

const {
	Standard: {
		Promise: {sleep, promisify},
		Number: {random}
	}
} = require('../helpers');

/**
 * Wrap function with caching layer
 * @name cachify-wrapper
 * @param {Object} fn
 * @param {Object} cache - KVStorage [must provide set(key, value, expired), get(key) methods]
 * @param {Object} [options]
 * @param {Number|Object} [options.expire] - key expire options
 * @param {Number} [options.expire.ttl=Infinity] - cached data ttl
 * @param {Number} [options.expire.deviation=options.expire.ttl/100] - expire deviation
 * @param {Object} [options.lock] - lock similar initial request to data source
 * @param {Number} [options.lock.timeout=1000] - lock timeout
 * @param {String} [options.lock.placeholder='?'] - lock placeholder
 * @param {Number} [options.latency=options.lock.timeout] - expected source response time (with `options.retries` affect on awaiting for duplicate requests for first request result)
 * @param {Number} [options.retries=(options.lock.timeout/options.latency)+1] - number of passes before new actual request
 * @param {String} [options.prefix=''] - prefix for keys in KVStorage
 * @param {Boolean|Object} [options.stale] - allow to use a stale data
 * @param {Number} [options.stale.lock=options.lock.timeout] - lock timeout for updating stale data
 * @param {Function} [options.hasher=JSON.stringify] - creating key for KV-storage function
 * @return {Function} wrapped function
 * @example
 * const wrapper = require('cachify-wrapper');
 * const redis = require('redis');
 * class RedisCache {
 *  constructor() {
 *   const client = redis.createClient();
 *   this.set = (key, value, expire) =>
 *    new Promise((resolve, reject) =>
 *     client.set(key, JSON.stringify(value),
 *      (error, value) =>
 *       error ?
 *        reject(error) :
 *         expire ?
 *          client.pexpire(key, expire, (error) => error ? reject(error) : resolve(value)) :
 *          resolve(value)));
 *
 *   this.get = (key) =>
 *    new Promise((resolve, reject) =>
 *     client.get(key, (error, value) =>
 *      error ?
 *       reject(error) :
 *       resolve(JSON.parse(value))));
 *  }
 * }
 * const cache = new RedisCache();
 * const sourceFunc = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
 * const options = {expire: {ttl: 500}, lock: {timeout: 100, placeholder: '???'}, latency: 100, retries: 1, prefix: '__sourceFunc__:'};
 * const cached = wrapper(sourceFunc, cache, options);
 * cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})); // Invoke new request
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 200); // Will get cached result
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 50); // Will invoke new actual request (because of low retries & latency options it can't wait for first invoke cache)
 */
module.exports = function (fn, cache, {expire: {ttl, deviation} = {}, expire, lock: {timeout, placeholder = '?'} = {}, stale, hasher, latency, retries, prefix = ''} = {}) {
	ttl = Number.isFinite(ttl) ?
		ttl > 0 ?
			ttl :
			1 :
		Number.isFinite(expire) && expire > 0 ?
			expire :
			Infinity;

	deviation = Number.isFinite(deviation) && deviation > 0 ? deviation : ttl / 100;

	timeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 1000;

	latency = Number.isFinite(latency) && latency > 0 ? latency : timeout;
	retries = Number.isFinite(retries) && retries > 0 ? retries : Math.floor(timeout / latency) + 1;

	const staleLock = stale && stale.lock && Number.isFinite(stale.lock) && stale.lock > 0 ? stale.lock : timeout;

	prefix = typeof prefix === 'string' ? prefix : '';

	const promisifiedFN = promisify(fn);

	const cacheSet = promisify(cache.set, cache);
	const cacheGet = promisify(cache.get, cache);

	const cacheLock = timeout === Infinity ?
		(key) => cacheSet(key, placeholder) :
		(key) => cacheSet(key, placeholder, timeout);

	const cacheLockStale = (key, response = {}) => cacheSet(key, Object.assign({}, response, {stale: Date.now()}));

	const getOnLock = async function (key) {
		for (let i = 0; i < retries; i++) {
			const response = await sleep(latency).then(() => cacheGet(key));
			if (response && response !== placeholder) {
				return response.payload;
			}
		}
		const error = new Error(key);
		error.code = 'ETIMEDOUT';
		throw error;
	};

	const handleResponse = (stale || ttl === Infinity) ?
		(key, payload) => {
			cacheSet(key, {payload, timestamp: Date.now()});
			return payload;
		} :
		(key, payload) => {
			cacheSet(key, {payload, timestamp: Date.now()}, Math.floor(ttl + random(0, deviation)));
			return payload;
		};

	hasher = hasher ?
		hasher :
		(a, prefix) => prefix + JSON.stringify(a);

	return function () {
		const key = hasher(arguments, prefix);

		return cacheGet(key).catch()
			.then((response) => {
				const {payload} = response || {};

				if (payload) {
					if (
						stale &&
						(Date.now() > response.timestamp + ttl) &&
						(!response.stale || (Date.now() > response.stale + staleLock))
					) {
						Promise.all([promisifiedFN.apply(undefined, arguments), cacheLockStale(key, response).catch(console.error)])
							.then(([responce]) => handleResponse(key, responce));
					}
					return payload;
				} else {
					return response === placeholder ?
						getOnLock(key).catch(() =>
							Promise.all([promisifiedFN.apply(undefined, arguments), cacheLock(key).catch(console.error)])
								.then(([response]) => handleResponse(key, response))) :
						Promise.all([promisifiedFN.apply(undefined, arguments), cacheLock(key).catch(console.error)])
							.then(([response]) => handleResponse(key, response));
				}

			});
	};

	/**
	 * npm install --save cachify-wrapper
	 * @name Installation
	 */
};
