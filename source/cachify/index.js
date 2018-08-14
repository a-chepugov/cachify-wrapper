'use strict';
const {
	Standard: {
		Promise: {sleep, promisify},
		Number: {random},
	}
} = require("helpers-js");

/**
 * Создает кеширующую обертку для функции
 * @name cachify
 * @param {Object} fn
 * @param {Object} cache - CacheInterface (must provide set, get & expire methods)
 * @param {Object} [options]
 * @param {Number|Object} [options.expire] - key expire options
 * @param {Number} [options.expire.ttl=Infinity] - cached data ttl
 * @param {Number} [options.expire.deviation=options.expire.ttl/100] - expire deviation
 * @param {Object} [options.lock] - lock similar initial request to data source
 * @param {Number} [options.lock.timeout=1000] - lock timeout
 * @param {String} [options.lock.placeholder='?'] - lock placeholder
 * @param {Number} [options.latency=options.lock.timeout] - time to awaiting responce from source
 * @param {Number} [options.retries=3] - multiplier for `options.latency` to awaiting responce from source before new call
 * @param {Boolean|Object} [options.stale] - allow to use a stale data
 * @param {Number} [options.stale.lock=options.retries*options.latency] - lock timout for updating stale data
 * @param {Function} [options.hasher=JSON.stringify] - function for creating key for KV-storage
 */
module.exports = function (fn, cache, {expire: {ttl, deviation} = {}, expire, lock: {timeout, placeholder = '?'} = {}, stale, hasher = JSON.stringify, latency, retries, prefix = ''} = {}) {
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
	retries = Number.isFinite(retries) && retries > 0 ? retries : 3;

	const staleLock = stale && stale.lock && Number.isFinite(stale.lock) && stale.lock > 0 ? stale.lock : latency * retries;

	prefix = typeof prefix === 'string' ? prefix : '';

	const promisifiedFN = promisify(fn);

	const cacheSet = promisify(cache.set, cache);
	const cacheGet = promisify(cache.get, cache);
	const cacheExpire = promisify(cache.expire, cache);

	const cacheLock = (key) =>
		cacheSet(key, placeholder)
			.then(() => timeout !== Infinity ? cacheExpire(key, timeout) : Promise.resolve());

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
			cacheSet(key, {payload, timestamp: Date.now()})
				.then(() => cacheExpire(key, ttl + random(0, deviation)));
			return payload;
		};

	return function () {
		const key = prefix + hasher(arguments);

		return cacheGet(key).catch()
			.then((response) => {
				const {payload} = response || {};

				if (payload) {
					if (
						stale
						&& (Date.now() > response.timestamp + ttl)
						&& (!response.stale || (Date.now() > response.stale + staleLock))
					) {
						Promise.all([promisifiedFN.apply(undefined, arguments), cacheLockStale(key, response).catch(console.error)])
							.then(([responce]) => handleResponse(key, responce))
					}
					return payload;
				} else {
					return response === placeholder ?
						getOnLock(key) :
						Promise.all([promisifiedFN.apply(undefined, arguments), cacheLock(key).catch(console.error)])
							.then(([responce]) => handleResponse(key, responce));
				}
			})
	}
};
