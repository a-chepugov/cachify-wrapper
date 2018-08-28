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

	it('hasher', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
		const cached = tested(fn, cache, {expire: {ttl: Infinity}, hasher: (a) => a + '___'});

		return new Promise((resolve, reject) => {
			cached(123).catch()
				.then(() => expect(cache.cache.has('123___')).to.equal(true))
				.then(() => resolve()).catch((error) => reject(error));
		});
	});

	it('ttl', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
		const cached = tested(fn, cache, {expire: {ttl: 250}, hasher: (a) => a});

		return new Promise((resolve, reject) => {
			cached(123)
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => sleep(300))
				.then(() => expect(cache.cache.has(123)).to.equal(false))
				.then(() => resolve()).catch((error) => reject(error));
		});
	});

	it('ttl === Infinity', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
		const cached = tested(fn, cache, {expire: {ttl: Infinity}, hasher: (a) => a});

		return new Promise((resolve, reject) => {
			cached(123)
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => sleep(300))
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => resolve()).catch((error) => reject(error));
		});
	});

	it('ttl. stale', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
		const cached = tested(fn, cache, {expire: {ttl: 250}, hasher: (a) => a, stale: true});

		return new Promise((resolve, reject) => {
			cached(123)
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => sleep(300))
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => resolve()).catch((error) => reject(error));
		});
	});

	it('lock', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 200));
		const cached = tested(fn, cache, {expire: {ttl: 1000}, hasher: (a) => a, lock: {timeout: 100, placeholder: '?-?'}});

		return new Promise((resolve) => {
			cached(123);

			// Проверяем наличие метки блокировки
			setTimeout(() => expect(cache.cache.get(123)).to.equal('?-?'), 10);

			// Истечение срока метки блокировки
			setTimeout(() => expect(cache.cache.has(123)).to.equal(false), 150);

			// Сохранение ответа
			setTimeout(() => expect(cache.cache.get(123).payload).to.equal(246), 250);

			setTimeout(() => resolve(), 300);
		});
	});

	it('stale. lock', () => {
		const cache = new InMemoryStorageWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 300));
		const cached = tested(fn, cache, {expire: {ttl: 25}, hasher: (a) => a, stale: {lock: 50}});

		let stale;

		return new Promise((resolve, reject) => {
			cached(123)
				.then(() => sleep(30))
				.then(() => expect(cache.cache.has(123)).to.equal(true))
				.then(() => {
					cached(123); // Ставим на обработку
				})
				.then(() => sleep(15))
				.then(() => {
					stale = cache.cache.get(123).stale;
					expect(stale !== undefined).to.equal(true);
				})
				.then(() => sleep(50))
				.then(() => {
					cached(123); // Ставим на обработку после истечения stale блокировки
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
		const fn = () => new Promise((resolve) => setTimeout(() => {
			const r = ++i;
			resolve(r);
		}, 100));
		const cached = tested(fn, cache, {expire: {ttl: 500}, latency: 25, retries: 1});

		return new Promise((resolve, reject) => {
			cached(123).then((r) => expect(r).to.equal(1)).catch((error) => reject(error));

			// Не получит ответ вовремя
			setTimeout(() => cached(123).then((r) => expect(r).to.equal(2)).catch((error) => reject(error)), 50);

			// Получит ответ из кеша
			setTimeout(() => cached(123).then((r) => expect(r).to.equal(1)).catch((error) => reject(error)), 125);

			// Получит ответ из кеша от второго запроса
			setTimeout(() => cached(123).then((r) => expect(r).to.equal(2)).catch((error) => reject(error)), 200);

			setTimeout(() => resolve(), 250);
		});
	});

	class InMemoryStorageDelayWrapper extends InMemoryStorageWrapper {
		constructor() {
			super();
		}

		get(key) {
			return new Promise((resolve) => setTimeout(() => resolve(this.cache.get(key)), 100));
		}
	}

	it('timeout. fail', () => {
		const cache = new InMemoryStorageDelayWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
		const cached = tested(fn, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

		return cached(123)
			.catch(() => expect(true).to.equal(true));
	});

	it('timeout. success', () => {
		const cache = new InMemoryStorageDelayWrapper();
		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
		const cached = tested(fn, cache, {expire: {ttl: 250}, timeout: 150, latency: 50, retries: 1});

		return cached(123)
			.then((payload) => expect(payload).to.equal(246));
	});

	it('cache. expired data stuck', () => {
		class InMemoryStorageNoExpireWrapper extends InMemoryStorageWrapper {
			constructor() {
				super();
			}

			set(key, value) {
				this.cache.set(key, value);
			}
		}

		const cache = new InMemoryStorageNoExpireWrapper();
		let i = 0;
		const fn = () => ++i;

		const cached = tested(fn, cache, {expire: {ttl: 150}, hasher: (a) => a});

		return cached(125)
			.then((payload) => expect(payload).to.equal(1))
			.then(() => sleep(250))
			.then(() => expect(cache.cache.has(125)).to.equal(true))
			.then(() => cached(125).then((payload) => expect(payload).to.equal(2)))
	});

	describe('cache access fail', () => {
		const consoleError = console.error;

		before(() => console.error = new Function());

		class InMemoryStorageErrorReadWrapper extends InMemoryStorageWrapper {
			get(key) {
				throw new Error('get error');
			}
		}

		it('read', () => {
			const cache = new InMemoryStorageErrorReadWrapper();
			const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
			const cached = tested(fn, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

			return cached(125).then((payload) => expect(payload).to.equal(250))
				.then(() => cached(125).then((payload) => expect(payload).to.equal(250)));
		});

		class InMemoryStorageErrorWriteWrapper extends InMemoryStorageWrapper {
			set(key) {
				throw new Error('set error');
			}
		}

		it('write', () => {
			const cache = new InMemoryStorageErrorWriteWrapper();
			const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 150));
			const cached = tested(fn, cache, {expire: {ttl: 250}, timeout: 50, latency: 50, retries: 1});

			return cached(125).then((payload) => expect(payload).to.equal(250))
				.then(() => cached(125).then((payload) => expect(payload).to.equal(250)));
		});

		after(() => console.error = consoleError);

	});

});
