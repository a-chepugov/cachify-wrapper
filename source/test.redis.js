const expect = require('chai').expect;
const tested = require('./index');

describe('cachify-wrapper', async function () {

	describe('redis', async function () {

		const redis = require('redis');

		class RedisWrapper {
			constructor() {
				const client = redis.createClient();
				this.set = (key, value, expire) =>
					new Promise((resolve, reject) =>
						client.set(key, JSON.stringify(value),
							(error, value) =>
								error ?
									reject(error) :
									expire ?
										client.pexpire(key, expire, (error) => error ? reject(error) : resolve(value)) :
										resolve(value))
					);

				this.get = (key) =>
					new Promise((resolve, reject) =>
						client.get(key, (error, value) =>
							error ?
								reject(error) :
								resolve(JSON.parse(value))));
			}
		}

		it('latency & retries', async function () {

			let i = 0;
			const fn = (a) => new Promise((resolve) => setTimeout(() => {
				i++;
				resolve(a * 2);
			}, 250));

			const cache = new RedisWrapper();
			const options = {expire: {ttl: 500}, latency: 100, retries: 1};
			const cached = tested(fn, cache, options);

			return new Promise((resolve, reject) => {
				cached(123).catch().then(() => expect(i).to.equal(1)).catch((error) => reject(error));

				setTimeout(() => { // Не получит ответ вовремя
					cached(123).catch().then(() => expect(i).to.equal(2)).catch((error) => reject(error));
				}, 50);

				setTimeout(() => { // Получит ответ из кеша
					cached(123).catch().then(() => expect(i).to.equal(1)).catch((error) => reject(error));
				}, 200);

				setTimeout(() => resolve(), 500);
			});
		});

	});

});
