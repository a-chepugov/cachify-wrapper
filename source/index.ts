'use strict';

import {Record, RecordData} from './Record';

import sleep from './helpers/sleep';

import random from './helpers/random';

import Next from './helpers/Next';

import {CacheStorage, Strategy, StrategyConstructor} from "./Interfaces";

import * as Strategies from './Strategies';

export * as Strategies from './Strategies';

import InMemoryStorageWrapper from './InMemoryStorageWrapper';

const id = (id: any) => id;

/**
 * Wraps a function with a caching layer
 * @name cachify-wrapper
 * @param {Function} fn - source of data
 * @param {Object} [storage=InMemoryStorageWrapper<K, V>] - cache storage that implements CacheStorage<K, V> interface [must provide get(key) and set(key, value, expired) methods]
 * @param {Object} [options]
 * @param {Number} [options.expire=1000] - cached data ttl (TimeToLive) [in milliseconds]
 * @param {Number} [options.deviation=options.expire/100] - expire ttl deviation (prevents simultaneous keys deletions)
 * @param {Number} [options.stale] - additional ttl for stale data
 * @param {Number} [options.ttl=options.expire+options.stale] - forced ttl for data (useful in case on multiply service with different expire)
 * @param {Number} [options.lock=1000] - lock timeout (prevents simultaneous concurrent invoke of `fn` at initial period)
 * @param {Function} [options.hasher=JSON.stringify] - creates key for KV-storage by `fn` arguments
 * @param {Number} [options.storage.timeout=Infinity] - max cache response time before considering it as disabled, and invoking actual request to source
 * @param {Number} [options.storage.strategy=Strategies.ASYNC] - invoke and return strategy for `storage`
 * @param {Number} [options.source.timeout=Infinity] - max fn response time before considering it as failed
 * @param {Number} [options.source.strategy=Strategies.ASYNC] - invoke and return strategy for `fn`
 * @param {Number} [options.source.latency=options.source.timeout] - expected source response time. With `options.retries` affect on awaiting for duplicate requests for first request result
 * @param {Number} [options.retries=(options.lock.timeout/options.latency)+1] - number of passes before new actual request
 * @return {Function} wrapped `fn`
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
 * const options = {expire: 500, lock: 100, latency: 100, retries: 1};
 * const cached = wrapper(sourceFunc, cache, options);
 * cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})); // Invoke new request
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 200); // Will get cached result
 * setTimeout(() => cached(123).then((payload) => console.dir(payload, {colors: true, depth: null})), 50); // Will invoke new actual request (because of low retries & latency options it can't wait for first invoke cache)
 */
export default function <K>(
	fn: (...args: any[]) => any,
	storage: CacheStorage<K, any> = new InMemoryStorageWrapper<K, any>(),
	{
		expire, deviation, stale, ttl, lock, retries,
		source: sourceConfig,
		storage: storageConfig,
		hasher,
		debug
	}: {
		expire?: number,
		deviation?: number,
		stale?: number,
		ttl?: number,
		lock?: number,
		retries?: number,
		source?: { timeout?: number, strategy?: StrategyConstructor<any>, latency?: number },
		storage?: { timeout?: number, strategy?: StrategyConstructor<any> },
		hasher?: (...args: Parameters<typeof fn>) => K,
		debug?: boolean,
	} = {}
) {
	type ARGS = Parameters<typeof fn>;
	type RESULT = ReturnType<typeof fn>;

	const timeoutSource = Number.isFinite(sourceConfig?.timeout) ? Math.floor(sourceConfig?.timeout) : Infinity;
	const timeoutStorage = Number.isFinite(storageConfig?.timeout) ? Math.floor(storageConfig?.timeout) : Infinity;

	const SourceStrategy = sourceConfig?.strategy ? sourceConfig.strategy : Strategies.ASYNC;
	const StorageStrategy = storageConfig?.strategy ? storageConfig.strategy : Strategies.ASYNC;

	expire = Number.isFinite(expire) ? Math.floor(expire) : 1000;
	deviation = Number.isFinite(deviation) ? Math.floor(deviation) : Math.floor(expire / 1000);
	stale = Number.isFinite(stale) ? Math.floor(stale) : 0;
	ttl = Math.floor(ttl) > (expire + stale) ? Math.floor(ttl) : (expire + stale);

	const latency = Number.isFinite(sourceConfig?.latency) ?
		Math.floor(sourceConfig?.latency) :
		Number.isFinite(timeoutSource) ?
			Math.floor(timeoutSource) : 100;

	lock = Number.isFinite(lock) ? Math.floor(lock) : latency;

	retries = Number.isFinite(retries) ? Math.floor(retries) : Math.floor(lock / latency) + 1;

	hasher = typeof hasher === 'function' ? hasher : (...args: any[]) => JSON.stringify(args) as unknown as K;

	const log = {
		error: debug ? console.error : (..._args: any[]): any => undefined,
		info: debug ? console.info : (..._args: any[]): any => undefined,
	};

	const lockRecordNext = (key: K, record: Record<RESULT>, storageSet: Strategy<any>) =>
		Next.of(key, record)
			.next((cb: any, key: K, record: Record<RESULT>) => {
				const now = Date.now()
				const recordWithLock = Record.from(record);
				recordWithLock.lock = now;
				const lockTTL = Number.isFinite(recordWithLock.timestamp) ? recordWithLock.timestamp - now + ttl + random(0, deviation) + stale : lock;
				return storageSet.execute(cb)(key, recordWithLock, lockTTL);
			})

	const saveResultNext = (key: K, result: RESULT, storageSet: Strategy<any>) =>
		Next.of(key, result)
			.next((cb: any, key: K, result: RESULT) => {
				const recordTTL = ttl + random(0, deviation) + stale;
				return storageSet.execute(cb)(key, Record.of(result), recordTTL);
			})
			.next((cb: any, error: any, _result: any): any => error ? log.error(error) : undefined)

	const calculateResultNext = (context: any, args: ARGS, record: Record<RESULT>, source: Strategy<RESULT>) =>
		Next.of(context, args)
			.next((cb: any, context: any, args: ARGS) => source.execute(cb).apply(context, args))
			.next((cb: any, error: any, result: RESULT) => {
				if (error) {
					log.error(error);
					const now = Date.now();
					return (stale > 0 && record?.value && ((record.timestamp + expire + deviation + stale) >= now)) ?
						cb(undefined, record?.value) :
						cb(error);
				} else {
					return cb(error, result);
				}
			})

	const getFromCache = (context: any, retries: number, args: ARGS, key: K, source: Strategy<RESULT>, storageGet: Strategy<Record<RESULT>>, storageSet: Strategy<any>): any =>
		Next.of(args, key)
			.next((cb: any, args: ARGS, key: K) => storageGet.execute(cb)(key))
			.next((cb: any, error: any, recordData: RecordData<RESULT>) => {
				error ? log.error(error) : undefined;
				const record = Record.from(recordData);
				const now = Date.now();

				if (record?.timestamp && ((record.timestamp + expire + deviation) >= now)) {
					// record exists and it's fresh
					return cb(source.reveal(undefined, record.value));
				} else if (lock > 0 && record?.lock && ((record?.lock + lock) >= now) && retries > 0) {
					// lock record exists
					return cb(sleep(latency)().then(() => getFromCache(context, retries - 1, args, key, source, storageGet, storageSet)));
				} else {
					// no record or record is outdated
					const resultNext = calculateResultNext(context, args, record, source)
						.next((cb: any, error: any, result: RESULT) => {
							if (!error) {
								saveResultNext(key, result, storageSet).execute();
							}
							return cb(source.reveal(error, result));
						})

					const next = lock > 0 ?
						lockRecordNext(key, record, storageSet)
							.next((cb: any) => cb(resultNext.execute(id))) :
						resultNext;

					return cb(next.execute(id));
				}
			})
			.execute(id);

	return function (...args: ARGS) {
		const key = hasher.apply(hasher, args);

		const source = new SourceStrategy(fn, {timeout: timeoutSource});
		const storageGet = new StorageStrategy(storage.get.bind(storage), {timeout: timeoutStorage});
		const storageSet = new StorageStrategy(storage.set.bind(storage), {timeout: timeoutStorage});

		source.args.apply(source, args);

		return getFromCache(this, retries, args, key, source, storageGet, storageSet)
	}
};
