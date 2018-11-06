const expect = require('chai').expect;
const tested = require('./index');
const sleep = require('../helpers/Standard/Promise/sleep');

describe('cachify-wrapper', () => {

	const InMemoryStorage = require('../helpers/Standard/Map/InMemoryStorage');

	class InMemoryStorageWrapper {
		constructor() {
			this.cache = new InMemoryStorage();
		}

		set(key, value, expire) {
			this.cache.set(key, value);
			if (expire) {
				this.cache.expire(key, expire);
			}
		}

		get(key) {
			return this.cache.get(key);
		}
	}

	describe('arguments', () => {
		it('hasher', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
			const fn1 = tested(fn0, cache, {expire: {ttl: Infinity}, hasher: (a) => a + '___'});

			return new Promise((resolve, reject) => {
				fn1(123).catch()
					.then(() => expect(cache.cache.has('123___')).to.equal(true))
					.then(() => sleep(500))
					.then(() => expect(cache.cache.has('123___')).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, hasher: (a) => a});

			return new Promise((resolve, reject) => {
				fn1(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(false))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl === Infinity', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
			const fn1 = tested(fn0, cache, {expire: {ttl: Infinity}, hasher: (a) => a});

			return new Promise((resolve, reject) => {
				fn1(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl. stale', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, hasher: (a) => a, stale: true});

			return new Promise((resolve, reject) => {
				fn1(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('lock', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 200));
			const fn1 = tested(fn0, cache, {expire: {ttl: 1000}, hasher: (a) => a, lock: 100});

			return new Promise((resolve) => {
				fn1(123);

				// Проверяем наличие метки блокировки
				setTimeout(() => expect(Number.isFinite(cache.cache.get(123).lock)).to.equal(true), 10);

				// Истечение срока метки блокировки
				setTimeout(() => expect(cache.cache.has(123)).to.equal(false), 150);

				// Сохранение ответа
				setTimeout(() => expect(cache.cache.get(123).value).to.equal(246), 250);

				setTimeout(() => resolve(), 300);
			});
		});

		it('stale. lock', () => {
			const cache = new InMemoryStorageWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 300));
			const fn1 = tested(fn0, cache, {expire: {ttl: 25}, hasher: (a) => a, stale: {lock: 50}});

			let stale;

			return new Promise((resolve, reject) => {
				fn1(123)
					.then(() => sleep(30))
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => {
						fn1(123); // Ставим на обработку
					})
					.then(() => sleep(15))
					.then(() => {
						stale = cache.cache.get(123).stale;
						expect(stale !== undefined).to.equal(true);
					})
					.then(() => sleep(50))
					.then(() => {
						fn1(123); // Ставим на обработку после истечения stale блокировки
					})
					.then(() => sleep(15))
					.then(() => {
						let staleNew = cache.cache.get(123).stale;
						expect(staleNew !== stale).to.equal(true);
					})
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('latency & retries', () => {
			const cache = new InMemoryStorageWrapper();
			let i = 0;
			const fn0 = () => new Promise((resolve) => setTimeout(() => {
				const r = ++i;
				resolve(r);
			}, 100));
			const fn1 = tested(fn0, cache, {expire: {ttl: 500}, latency: 25, retries: 1});

			return new Promise((resolve, reject) => {
				fn1(123).then((r) => expect(r).to.equal(1)).catch((error) => reject(error));

				// Не получит ответ вовремя
				setTimeout(() => fn1(123).then((r) => expect(r).to.equal(2)).catch((error) => reject(error)), 50);

				// Получит ответ из кеша
				setTimeout(() => fn1(123).then((r) => expect(r).to.equal(1)).catch((error) => reject(error)), 125);

				// Получит ответ из кеша от второго запроса
				setTimeout(() => fn1(123).then((r) => expect(r).to.equal(2)).catch((error) => reject(error)), 200);

				setTimeout(() => resolve(), 250);
			});
		});

	});

	describe('multi cache', () => {
		class InMemoryStorageMultiWrapper extends InMemoryStorageWrapper {
			constructor() {
				super();

				this.setTouches = 0;
				this.getTouches = 0;
			}

			set(key, value, expire) {
				this.setTouches += 1;
				return super.set(key, value, expire);
			}

			get(key) {
				this.getTouches += 1;
				return super.get(key);
			}
		}

		it('two layers', () => {
			const cache1 = new InMemoryStorageMultiWrapper();
			const cache2 = new InMemoryStorageMultiWrapper();
			const fn0 = (a) => new Promise((resolve) => resolve(a));
			const fw1 = tested(fn0, cache1, {expire: {ttl: 100}, timeout: 50, latency: 50, retries: 1});
			const fw2 = tested(fw1, cache2, {expire: {ttl: 50}, timeout: 50, latency: 50, retries: 1});

			return fw2(123)
				.then((payload) => {
					expect(payload).to.equal(123);
					expect(cache1.setTouches).to.equal(2);
					expect(cache1.getTouches).to.equal(1);
					expect(cache2.setTouches).to.equal(2);
					expect(cache2.getTouches).to.equal(1);

				})
				.then(() => fw2(123))
				.then((payload) => {
					expect(payload).to.equal(123);
					expect(cache1.setTouches).to.equal(2);
					expect(cache1.getTouches).to.equal(1);
					expect(cache2.setTouches).to.equal(2);
					expect(cache2.getTouches).to.equal(2);
					return payload;
				})
				.then(() => sleep(75))
				.then(() => fw2(123))
				.then((payload) => {
					expect(payload).to.equal(123);
					expect(cache1.setTouches).to.equal(2);
					expect(cache1.getTouches).to.equal(2);
					expect(cache2.setTouches).to.equal(4);
					expect(cache2.getTouches).to.equal(3);
					return payload;
				})
				.then(() => sleep(75))
				.then(() => fw2(123))
				.then((payload) => {
					expect(payload).to.equal(123);
					expect(cache1.setTouches).to.equal(4);
					expect(cache1.getTouches).to.equal(3);
					expect(cache2.setTouches).to.equal(6);
					expect(cache2.getTouches).to.equal(4);
					return payload;
				});
		});

	});

	describe('access timeout (slow cache)', () => {
		class InMemoryStorageDelayWrapper extends InMemoryStorageWrapper {
			constructor() {
				super();
			}

			get(key) {
				return new Promise((resolve) => setTimeout(() => resolve(this.cache.get(key)), 100));
			}
		}

		it('timeout. fail', () => {
			let i = 0;
			const cache = new InMemoryStorageDelayWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => {
				i++;
				resolve(a);
			}, 150));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

			return fn1(123)
				.then((payload) => expect(payload).to.equal(123))
				.then(() => expect(i).to.equal(1))
				.then(() => fn1(123))
				.then(() => expect(i).to.equal(2));
		});

		it('timeout. success', () => {
			const cache = new InMemoryStorageDelayWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, timeout: 150, latency: 50, retries: 1});

			return fn1(123)
				.then((payload) => expect(payload).to.equal(246));
		});
	});

	describe('cache. expired stuck', () => {
		class InMemoryStorageNoExpireWrapper extends InMemoryStorageWrapper {
			constructor() {
				super();
			}

			set(key, value) {
				this.cache.set(key, value);
			}
		}

		it('lock', () => {
			const cache = new InMemoryStorageNoExpireWrapper();
			const fn0 = () => new Promise((resolve, reject) => reject());

			let lock;
			const fn1 = tested(fn0, cache, {expire: 1000, lock: 25, hasher: (a) => a});

			return fn1(125).catch(new Function())
				.then(() => {
					lock = cache.cache.get(125).lock;
					expect(Number.isFinite(lock)).to.equal(true);
				})
				.then(() => {
					fn1(125).catch(new Function());
				})
				.then(() => sleep(100))
				.then(() => {
					const lockNew = cache.cache.get(125).lock;
					expect(Number.isFinite(lockNew)).to.equal(true);
					expect(lockNew === lock).to.equal(false);
				});
		});

		it('data', () => {
			const cache = new InMemoryStorageNoExpireWrapper();
			let i = 0;
			const fn0 = () => ++i;

			const fn1 = tested(fn0, cache, {expire: {ttl: 150}, hasher: (a) => a});

			return fn1(125)
				.then((value) => expect(value).to.equal(1))
				.then(() => sleep(200))
				.then(() => expect(cache.cache.has(125)).to.equal(true))
				.then(() => {
					return fn1(125).then((payload) => {
						expect(payload).to.equal(2);
					});
				});
		});

	});

	describe('cache access fail', () => {
		const consoleError = console.error;

		before(() => console.error = new Function());

		class InMemoryStorageErrorReadWrapper extends InMemoryStorageWrapper {
			get() {
				throw new Error('get error');
			}
		}

		it('read', () => {
			const cache = new InMemoryStorageErrorReadWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

			return fn1(125).then((payload) => expect(payload).to.equal(250))
				.then(() => fn1(125).then((payload) => expect(payload).to.equal(250)));
		});

		class InMemoryStorageErrorWriteWrapper extends InMemoryStorageWrapper {
			set() {
				throw new Error('set error');
			}
		}

		it('write', () => {
			const cache = new InMemoryStorageErrorWriteWrapper();
			const fn0 = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
			const fn1 = tested(fn0, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

			return fn1(125).then((payload) => expect(payload).to.equal(250))
				.then(() => fn1(125).then((payload) => expect(payload).to.equal(250)));
		});

		after(() => console.error = consoleError);
	});

});
