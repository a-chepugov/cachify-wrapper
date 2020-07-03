import {expect} from 'chai';
import tested, {Strategies} from './index';
import sleep from './helpers/sleep';
import InMemoryStorageWrapper from './InMemoryStorageWrapper';

describe('cachify-wrapper', () => {

	it('function is invoked only once before cache expired', () => {
		let count = 0;
		const fn = (_: number) => count++;

		const fnCached = tested(fn, undefined, {expire: 100});

		return Promise.resolve()
			.then(() => fnCached(1))
			.then(() => sleep(5)())
			.then(() => fnCached(1))
			.then(() => expect(count).to.equal(1))
	});

	it('function is invoked again when expired', () => {
		let count = 0;
		const fn = (_: number) => count++;

		const fnCached = tested(fn, undefined, {expire: 10});

		return Promise.resolve()
			.then(() => fnCached(1))
			.then(() => sleep(25)())
			.then(() => fnCached(1))
			.then(() => expect(count).to.equal(2))
	});

	it('item is removed then cache on ttl end', () => {
		let count = 0;
		const fn0 = (_: number) => count++;
		const fn1 = tested(fn0, undefined, {expire: 25, hasher: (a) => a});

		return Promise.resolve()
			.then(() => fn1(123))
			.then(() => sleep(50)())
			.then(() => fn1(123))
			.then(() => expect(count).to.equal(2))
	});

	it('an item can live forever', () => {
		let count = 0;
		const fn = (_: number) => count++;
		const fnCached = tested(fn, undefined, {expire: Infinity});

		return Promise.resolve()
			.then(() => fnCached(123))
			.then(() => sleep(50)())
			.then(() => fnCached(123))
			.then(() => expect(count).to.equal(1))
	});


	it('durable request is invoked once with lock', () => {
		let count = 0;

		const fn0 = (_: number) => new Promise((resolve) => setTimeout(() => resolve(count++), 30));

		const fn1 = tested(fn0, undefined, {expire: 1000, hasher: (a: any) => a, lock: 99});

		sleep(0)().then(() => fn1(123));
		sleep(10)().then(() => fn1(123));
		sleep(20)().then(() => fn1(123));

		return sleep(75)().then(() => expect(count).to.equal(1))
	});

	it('durable request is invoked twice with short lock time', () => {
		let count = 0;

		const fn = (_: number) => new Promise((resolve) => setTimeout(() => resolve(count++), 25));

		const fnCached = tested(fn, undefined, {expire: 1000, hasher: (a: any) => a, lock: 1});

		fnCached(123);

		return Promise.resolve()
			.then(() => sleep(5)())
			.then(() => fnCached(123))
			.then(() => expect(count).to.equal(2))
	});

	it('hasher', () => {
		let count = 0;
		const fn = (_: number) => count++;
		const fnCached = tested(fn, undefined, {expire: Infinity, hasher: (_: number) => 'z', debug: true});

		return Promise.resolve()
			.then(() => fnCached(123))
			.then(() => sleep(10)())
			.then(() => fnCached(123))
			.then(() => sleep(10)())
			.then(() => fnCached(123))
			.then(() => expect(count).to.equal(1))
	});

	it('can use stale data', () => {
		let counter = 0;
		const fn = (a: number) => {
			if (counter++ === 0) {
				return a * 2;
			} else {
				throw new Error('Calculation error');
			}

		};
		const hasher = (a: number) => a;

		const fnCached = tested(fn, undefined, {expire: 25, stale: 100, hasher});

		return Promise.resolve()
			.then(() => fnCached(123))
			.then(() => sleep(50)())
			.then(() => fnCached(123))
			.then((result) => expect(result).to.equal(246))
	});

	it('stale data expire', () => {
		let counter = 0;
		const fn = (a: number) => {
			if (counter++ === 0) {
				return a * 2;
			} else {
				throw new Error('Calculation error');
			}

		};
		const hasher = (a: number) => a;

		const fnCached = tested(fn, undefined, {expire: 25, lock: 1, stale: 25, hasher});

		return Promise.resolve()
			.then(() => fnCached(123))
			.then(() => sleep(75)())
			.then(() => fnCached(123))
			.catch((error) => error)
			.then((result) => expect(result.message).to.be.equal('Calculation error'))
	});

	it('latency & retries can be used to set lock timeout', () => {
		let i = 0;
		const fn = () => new Promise((resolve) => setTimeout(() => {
			const r = ++i;
			resolve(r);
		}, 100));
		const fnCached = tested(fn, undefined, {expire: 500, retries: 1, source: {latency: 25}});

		return new Promise((resolve, reject) => {
			setTimeout(() => fnCached(123).then((result: number) => expect(result).to.equal(1)).catch((error: any) => reject(error)), 0);

			// Не получит ответ вовремя и выполнит повторный запрос
			setTimeout(() => fnCached(123).then((result: number) => expect(result).to.equal(2)).catch((error: any) => reject(error)), 10);

			// Получит ответ из кеша
			setTimeout(() => fnCached(123).then((result: number) => expect(result).to.equal(1)).catch((error: any) => reject(error)), 100);

			// Получит ответ из кеша от второго запроса
			setTimeout(() => fnCached(123).then((result: number) => expect(result).to.equal(2)).catch((error: any) => reject(error)), 150);

			setTimeout(resolve, 200);
		});
	});


	describe('bad cache', () => {
		class InMemoryStorageDelayWrapper<K, V> extends InMemoryStorageWrapper<K, V> {
			constructor() {
				super();
			}

			// @ts-ignore
			get(key: K): Promise<V> {
				return new Promise((resolve) => setTimeout(() => resolve(this.cache.get(key)), 100));
			}
		}

		it('timeout fail', () => {
			let counter = 0;
			const fn = (a: number) => ++counter + a;
			const cache = new InMemoryStorageDelayWrapper<string, ReturnType<typeof fn>>();

			const fnCached = tested(fn, cache, {expire: 999, retries: 1, storage: {timeout: 5}, source: {latency: 50}});

			return Promise.resolve()
				.then(() => fnCached(123))
				.then((payload: any) => expect(payload).to.equal(124))
				.then(() => expect(counter).to.equal(1))
				.then(() => fnCached(123))
				.then((payload: any) => expect(payload).to.equal(125))
				.then(() => expect(counter).to.equal(2))
		});

		class InMemoryStorageErrorReadWrapper<K, V> extends InMemoryStorageWrapper<K, V> {
			get(): any {
				throw new Error('get error');
			}
		}

		it('read fail', () => {
			const cache = new InMemoryStorageErrorReadWrapper();
			const fn = (a: number) => a * 2;
			const fnCached = tested(fn, cache);

			return Promise.resolve()
				.then(() => fnCached(125))
				.then((payload: any) => expect(payload).to.equal(250))
				.then(() => fnCached(125).then((payload: any) => expect(payload).to.equal(250)));
		});

		class InMemoryStorageErrorWriteWrapper<K, V> extends InMemoryStorageWrapper<K, V> {
			set() {
				throw new Error('set error');
			}
		}

		it('write', () => {
			const cache = new InMemoryStorageErrorWriteWrapper();
			const fn = (a: any) => a * 2;
			const fnCached = tested(fn, cache);

			return Promise.resolve()
				.then(() => fnCached(125))
				.then((payload: any) => expect(payload).to.equal(250))
				.then(() => fnCached(125).then((payload: any) => expect(payload).to.equal(250)));
		});

	});

	it('strategy. SYNC', () => {
		let count = 0;
		const fn = (a: number) => {
			count++;
			return a * 2;
		};

		const wrapped = tested(fn, undefined, {
			expire: 50,
			source: {strategy: Strategies.SYNC},
			storage: {strategy: Strategies.SYNC}
		});
		expect(wrapped(1)).to.equal(2);
		expect(wrapped(1)).to.equal(2);
		expect(wrapped(2)).to.equal(4);
		expect(count).to.equal(2);
	});

	it('strategy. CALLBACK', () => {
		let count = 0;
		const fn = (_a: any, cb: any) => {
			cb(null, ++count);
		};

		const wrapped = tested(fn, undefined, {
			expire: 9999,
			storage: {strategy: Strategies.SYNC}, source: {strategy: Strategies.CALLBACK}
		});

		const p1 = new Promise((resolve) => {
			wrapped(1, (_error: any, value: any) => resolve(value));
		});

		const p2 = new Promise((resolve) => {
			wrapped(1, (_error: any, value: any) => resolve(value));
		});

		return Promise.all([p1, p2])
			.then(() => expect(count).to.equal(1))
	});

	describe('context', () => {
		it('sync', () => {
			let context = {a: 1, b: 2, c: 3};
			const fn = function () {
				expect(this).to.be.deep.equal(context);
			};

			const fbCached = tested(fn, undefined, {source: {strategy: Strategies.SYNC}});

			return fbCached.call(context);
		});

		it('callback', () => {
			let context = {a: 1, b: 2, c: 3};
			const fn = function (this: any, cb: (t: any) => any) {
				cb(this);
			};

			const fbCached = tested(fn, undefined, {source: {strategy: Strategies.CALLBACK}});

			return new Promise((resolve) => fbCached.call(context, resolve))
				.then((response) => {
					expect(response).to.be.deep.equal(context);
				})
		});

		it('async', () => {
			let context = {a: 1, b: 2, c: 3};
			const fn = function () {
				expect(this).to.be.deep.equal(context);
			};

			const fbCached = tested(fn, undefined, {source: {strategy: Strategies.ASYNC}});

			return fbCached.call(context);
		});

	})

});
