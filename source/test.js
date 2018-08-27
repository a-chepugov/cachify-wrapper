const expect = require('chai').expect;
const tested = require('./index');
const sleep = require('../helpers/Standard/Promise/sleep');

describe('cachify-wrapper', async function () {

	describe('InMemoryStorage', async function () {

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

		const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));

		it('hasher', async function () {
			const cache = new InMemoryStorageWrapper();
			const options = {expire: {ttl: Infinity}, hasher: (a) => a[0] + '___'};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123).catch()
					.then(() => expect(cache.cache.has('123___')).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl', async function () {
			const cache = new InMemoryStorageWrapper();
			const options = {expire: {ttl: 250}, hasher: (a) => a[0]};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(false))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl === Infinity', async function () {
			const cache = new InMemoryStorageWrapper();
			const options = {expire: {ttl: Infinity}, hasher: (a) => a[0]};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('ttl. stale', async function () {
			const cache = new InMemoryStorageWrapper();
			const options = {expire: {ttl: 250}, hasher: (a) => a[0], stale: true};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123)
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => sleep(300))
					.then(() => expect(cache.cache.has(123)).to.equal(true))
					.then(() => resolve()).catch((error) => reject(error));
			});
		});

		it('lock', async function () {
			const cache = new InMemoryStorageWrapper();
			const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 250));
			const options = {expire: {ttl: 250}, hasher: (a) => a[0], lock: {timeout: 100, placeholder: '?-?'}};
			const cached = tested(fn, cache, options);

			return new Promise((resolve) => {
				cached(123);
				setTimeout(() => expect(cache.cache.get(123)).to.equal('?-?'), 10);

				setTimeout(() => {
					expect(cache.cache.has(123)).to.equal(false);
				}, 150);

				setTimeout(() => {
					expect(cache.cache.get(123).payload).to.equal(246);
					resolve();
				}, 300);
			});
		});

		it('stale. lock', async function () {
			const cache = new InMemoryStorageWrapper();
			const fn = (a) => new Promise((resolve) => setTimeout(() => resolve(a * 2), 300));
			const options = {expire: {ttl: 25}, hasher: (a) => a[0], stale: {lock: 50}};
			const cached = tested(fn, cache, options);

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

		it('latency & retries', async function () {
			const cache = new InMemoryStorageWrapper();
			let i = 0;
			const fn = (a) => new Promise((resolve) => setTimeout(() => {
				i++;
				resolve(a * 2);
			}, 150));
			const options = {expire: {ttl: 250}, latency: 50, retries: 1};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123).catch().then(() => expect(i).to.equal(1)).catch((error) => reject(error));

				setTimeout(() => { // Не получит ответ вовремя
					cached(123).catch().then(() => expect(i).to.equal(2)).catch((error) => reject(error));
				}, 25);

				setTimeout(() => { // Получит ответ из кеша
					cached(123).catch().then(() => expect(i).to.equal(1)).catch((error) => reject(error));
				}, 200);

				setTimeout(() => resolve(), 300);
			});
		});

	});

});
