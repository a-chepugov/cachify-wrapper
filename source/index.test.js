const {expect} = require('chai');
const testee = require('./index.js').default;
const testeePromise = require('./index.js').promise;

const InMemoryStorageCb = require('./library/InMemoryStorageCb.js').InMemoryStorageCb;
const sleep = require('./library/sleep.js').default;
const promisify = require('./library/promisify.js').default;

describe('cachify-wrapper', () => {
	describe('examples', () => {
		it('`callback-last` style function', (done) => {
			const wrapper = testee;
			console.info = new Function();

			/**
			 * @ignore
			 */
			class Storage {
				constructor() {
					this.data = new Map();
					this.timers = new Map();
				}

				get(key, cb) {
					return cb(null, this.data.get(key));
				}

				set(key, value, ttl, cb) {
					if (this.timers.has(key)) {
						clearTimeout(this.timers.get(key));
						this.data.delete(key);
					}
					this.data.set(key, value);
					if (ttl > 0) {
						const timer = setTimeout(() => {
							clearTimeout(timer);
							this.data.delete(key);
						}, ttl);
						this.timers.set(key, timer);
					}
					cb(null, true);
				}

				del(key, cb) {
					return cb(null, this.data.delete(key));
				}
			}

			const storage = new Storage();
			let count = 0;
			const inc = (a, cb) => {
				cb(null, count += a);
			};
			const cached = wrapper(inc, storage, {expire: 1000});
			setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 0); // Invokes request
			setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 100); // Takes cached result
			setTimeout(() => cached(1, (_error, payload) => console.info(payload)), 200); // Invokes second request

			setTimeout(() => cached.set(2, 'manual value', 1000, () =>
				cached.get(2, (_, result) => {
					console.info(result);
					cached.del(2, () =>
						cached.get(2, (_, result) => console.info(result)));
				})), 400);

			setTimeout(() => {
				expect(count).to.be.equal(1);
				done();
			}, 300);
		});

		it('async function', () => {
			const wrapperPromise = testeePromise;
			console.info = new Function();

			/**
			 * @ignore
			 */
			class Storage {
				constructor() {
					this.data = new Map();
					this.timers = new Map();
				}

				get(key, cb) {
					return cb(null, this.data.get(key));
				}

				set(key, value, ttl, cb) {
					this.data.set(key, value);
					if (ttl > 0) {
						setTimeout(() => {
							this.data.delete(key);
						}, ttl);
					}
					cb(null, true);
				}

				del(key, cb) {
					return cb(null, this.data.delete(key));
				}
			}

			const storage = new Storage();

			let count = 0;
			const inc = async(a) => {
				count += a;
				return count;
			};

			const cached = wrapperPromise(inc, storage, {expire: 1000});
			const p1 = cached(1).then((payload) => console.info(payload)); // Invokes request
			const p2 = p1.then(() => cached(1).then((payload) => console.info(payload))); // Takes cached result

			return Promise.all([p1, p2]).then(() => expect(count).to.be.equal(1));
		});
	});

	it('if fn is not a functtion throws an Error', () => {
		expect(() => testee('not a function')).to.throw();
	});

	it('on second run wrapped function return previous result', () => {
		let count = 0;
		const fn = (a, cb) => cb(null, count++);

		const fnCached = testee(fn, undefined, {expire: 1000});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.then(() => sleep(10)())
			.then(() => fnPromisified(1))
			.then((response) => expect(response).to.be.equal(0));
	});

	it('function is invoked only once before cache expired', () => {
		let count = 0;
		const fn = (a, cb) => cb(null, count++);

		const fnCached = testee(fn, undefined, {expire: 1000});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.then(() => sleep(10)())
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.equal(1));
	});

	it('function is invoked again after cache expired', () => {
		let count = 0;
		const fn = (a, cb) => cb(null, count++);

		const fnCached = testee(fn, undefined, {expire: 50});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.then(() => sleep(100)())
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.equal(2));
	});

	it('an item can live forever', () => {
		let count = 0;
		const fn = (a, cb) => cb(null, count++);
		const fnCached = testee(fn, undefined, {expire: Infinity});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.then(() => sleep(150)())
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.equal(1));
	});

	it('use default expire time if undefined', () => {
		let count = 0;
		const fn = (a, cb) => cb(null, count++);

		const fnCached = testee(fn);
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.equal(1))
			.then(() => sleep(1001)())
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.equal(2));
	});

	it('set lock before request is invoked & second request will wait until lock expired', () => {
		let count = 0;
		const fn = (a, cb) => setTimeout(() => cb(null, count++), 100);

		const fnCached = testee(fn, undefined, {lock: 500});
		const fnPromisified = promisify(fnCached);

		const p1 = sleep(0)().then(() => fnPromisified(1));
		const p2 = sleep(25)().then(() => fnPromisified(1));
		const p3 = sleep(25)().then(() => fnPromisified(1));

		return Promise.all([p1, p2, p3]).then(() => expect(count).to.be.equal(1));
	});

	it('durable request is invoked twice with short lock time', () => {
		let count = 0;
		const fn = (a, cb) => setTimeout(() => cb(null, count++), 50);

		const fnCached = testee(fn, undefined, {expire: 1000, lock: 1});
		const fnPromisified = promisify(fnCached);

		const p0 = fnPromisified(123);
		const p1 = sleep(10)().then(() => fnPromisified(123));

		return Promise.all([p0, p1]).then(() => expect(count).to.be.equal(2));
	});

	it('ineffective locking on slow cache', () => {
		let count = 0;
		const fn = (a, cb) => setTimeout(() => cb(null, count++), 100);

		/**
		 * @ignore
		 */
		class InMemoryStorageWrapped extends InMemoryStorageCb {
			set(key, value, ttl, cb) {
				setTimeout(() => super.set(key, value, ttl, cb), 50);
			}
		}

		const fnCached = testee(fn, new InMemoryStorageWrapped(), {lock: 250});
		const fnPromisified = promisify(fnCached);

		return Promise.all([fnPromisified(1), fnPromisified(1), fnPromisified(1)])
			.then(() => expect(count).to.be.equal(3));
	});

	it('no locks if no lock time', () => {
		const fn = (a, cb) => setTimeout(() => cb(null, a), 50);

		let sets = 0;

		/**
		 * @ignore
		 */
		class Storage extends InMemoryStorageCb {
			set(key, value, ttl, cb) {
				sets++;
				super.set(key, value, ttl, cb);
			}
		}

		const storage = new Storage();

		const fnCached = testee(fn, storage, {expire: 1000});
		const fnPromisified = promisify(fnCached);

		return fnPromisified(1).then(() => expect(sets).to.be.equal(1));
	});

	it('use locks if with lock time', () => {
		const fn = (a, cb) => setTimeout(() => cb(null, a), 50);

		let sets = 0;

		/**
		 * @ignore
		 */
		class Storage extends InMemoryStorageCb {
			set(key, value, ttl, cb) {
				sets++;
				super.set(key, value, ttl, cb);
			}
		}

		const storage = new Storage();

		const fnCached = testee(fn, storage, {expire: 1000, lock: 1});
		const fnPromisified = promisify(fnCached);

		return fnPromisified(1).then(() => expect(sets).to.be.equal(2));
	});

	it('`retries` parameter set max retries number during lock time', () => {
		let count = 0;
		let retries = 0;

		const fn = (a, cb) => setTimeout(() => {
			count += a;
			cb(null, count);
		}, 500);

		const RETRIES = 10;

		/**
		 * @ignore
		 */
		class InMemoryStorageWrapped extends InMemoryStorageCb {
			get(key, cb) {
				retries++;
				super.get(key, cb);
			}
		}

		const fnCached = testee(fn, new InMemoryStorageWrapped(), {lock: 600, retries: RETRIES});
		const fnPromisified = promisify(fnCached);

		fnPromisified(1);

		return sleep(25)()
			// Прои получении ответа из кеша получит блокировку и будет повторно опрашивать кеш
			.then(() => fnPromisified(1))
			.then(() => expect(count).to.be.gte(1))
			.then(() => expect(retries).to.be.gte(RETRIES).and.to.be.lte(RETRIES + 2));
	});

	describe('hasher', () => {
		it('if hasher always returns `z`, fn invokes once with any input data', () => {
			let count = 0;
			const fn = (a, cb) => cb(null, count++);

			const fnCached = testee(fn, undefined, {expire: 1000}, (_) => 'z');
			const fnPromisified = promisify(fnCached);

			const p1 = fnPromisified(1);
			const p2 = fnPromisified(2);
			const p3 = fnPromisified(3);

			return Promise.all([p1, p2, p3]).then(() => expect(count).to.be.equal(1));
		});

		it('all params passed to hasher', () => {
			let count = 0;
			const fn = (...args) => args[args.length - 1](null, count++);

			const fnCached = testee(fn, undefined, {expire: 1000});
			const fnPromisified = promisify(fnCached);

			return Promise.all([
				fnPromisified(1),
				fnPromisified(2),
				fnPromisified(3),
				fnPromisified(1, 1),
				fnPromisified(1, 2),
				fnPromisified(1, 3),
				fnPromisified(1, 1, 1),
				fnPromisified(1, 1, 2),
				fnPromisified(1, 1, 3),
				fnPromisified(1, 1, 1, 1),
				fnPromisified(1, 1, 1, 2),
				fnPromisified(1, 1, 1, 3),
				fnPromisified(1, 1, 1, 1, 1),
				fnPromisified(1, 1, 1, 1, 2),
				fnPromisified(1, 1, 1, 1, 3),
				sleep(100)().then(() => fnPromisified(1)),
				sleep(100)().then(() => fnPromisified(2)),
				sleep(100)().then(() => fnPromisified(3)),
				sleep(100)().then(() => fnPromisified(1, 1)),
				sleep(100)().then(() => fnPromisified(1, 2)),
				sleep(100)().then(() => fnPromisified(1, 3)),
				sleep(100)().then(() => fnPromisified(1, 1, 1)),
				sleep(100)().then(() => fnPromisified(1, 1, 2)),
				sleep(100)().then(() => fnPromisified(1, 1, 3)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 1)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 2)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 3)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 1, 1)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 1, 2)),
				sleep(100)().then(() => fnPromisified(1, 1, 1, 1, 3)),
			]).then(() => expect(count).to.be.equal(15));
		});

		it('if hasher is not a functtion throws an Error', () => {
			const fn = (a, cb) => cb(null, a);
			expect(() => testee(fn, undefined, {expire: 1000}, 'not a function')).to.throw();
		});

		it('call fn if hasher fails', () => {
			let count = 0;

			const fn = (cb) => cb(null, count++);
			const hasher = () => {
				throw new Error('ooops');
			};

			const fnCached = testee(fn, undefined, {expire: 1000, verbose: 0}, hasher);
			const fnPromisified = promisify(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified())
				.then(() => fnPromisified())
				.then(() => fnPromisified())
				.then(() => expect(count).to.be.equal(3))
		});
	});

	it('function will invoke again before using stale data', () => {
		let counter = 0;
		const fn = (a, cb) => {
			counter === 0 ?
				cb(null, a * 2) :
				cb(new Error('Calculation error'));
			counter++;
		};

		const fnCached = testee(fn, undefined, {expire: 1, stale: 1000});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(123))
			.then(() => sleep(25)())
			.then(() => fnPromisified(123))
			.then(() => fnPromisified(123))
			.then(() => expect(counter).to.be.equal(3));
	});

	it('use stale data if saved result exists and function threw error', () => {
		let state = true;
		const fn = (a, cb) => {
			state ?
				cb(null, a * 2) :
				cb(new Error('Calculation error'));
			state = false;
		};

		const fnCached = testee(fn, undefined, {expire: 1, stale: 1000});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(123))
			.then(() => sleep(25)())
			.then(() => fnPromisified(123))
			.then((result) => expect(result).to.be.equal(246));
	});

	it('stale data expire', () => {
		let counter = 0;
		const fn = (a, cb) => {
			counter === 0 ?
				cb(null, a * 2) :
				cb(new Error('Calculation error'));
			counter++;
		};

		const fnCached = testee(fn, undefined, {expire: 1, stale: 1});
		const fnPromisified = promisify(fnCached);
		return Promise.resolve()
			.then(() => fnPromisified(123))
			.then(() => sleep(50)())
			.then(() => fnPromisified(123))
			.catch((error) => error)
			.then((response) => expect(response).to.have.property('message', 'Calculation error'));
	});

	it('cache erroneous state to reduce load', () => {
		let count = 0;
		const fn = (a, cb) => cb(new Error(String(++count)));

		const fnCached = testee(fn, undefined, {expire: 1000, error: 1000});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.catch((error) => error)
			.then((response) => expect(response).to.have.property('message', '1'))
			.then(() => sleep(25)())
			.then(() => fnPromisified(1))
			.catch((error) => error)
			.then((response) => expect(response).to.have.property('message', '1'))
			.then(() => expect(count).to.be.equal(1));
	});

	it('expire erroneous state cache', () => {
		let count = 0;
		const fn = (a, cb) => cb(new Error(String(++count)));

		const fnCached = testee(fn, undefined, {error: 1});
		const fnPromisified = promisify(fnCached);

		return Promise.resolve()
			.then(() => fnPromisified(1))
			.catch((error) => error)
			.then(() => sleep(50)())
			.then(() => fnPromisified(1))
			.catch((error) => error)
			.then(() => expect(count).to.be.equal(2));
	});

	describe('pass this context', () => {
		it('callback', () => {
			const context = {a: 1};

			/**
			@param {CB<any>} cb
			 */
			function fn(cb) {
				cb(null, this);
			}

			const fnCached = testee(fn);

			return Promise.resolve()
				.then(() => {
					return fnCached.call(context, (_error, result) => {
						expect(result).to.be.equal(context);
					});
				});
		});

		it('promise', () => {
			const context = {a: 1};

			/**
			@param {CB<any>} cb
			 */
			function fn() {
				return this;
			}

			const fnPromisified = testeePromise(fn);

			return fnPromisified.call(context)
				.then((result) => {
					expect(result).to.be.equal(context);
				});
		});
	});

	describe('direct access methods', () => {
		it('`get` method allow to get value from cache storage directly', () => {
			const fn = (a, cb) => cb(null, a);

			const fnCached = testee(fn, undefined, {expire: 1000});
			const fnPromisified = promisify(fnCached);
			const get = promisify(fnCached.get).bind(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified(1))
				.then(() => get(1))
				.then((response) => expect(response).to.be.equal(1));
		});

		it('`set` method put value to cache storage without original function call', () => {
			let count = 0;
			const fn = (a, cb) => cb(null, count++);

			const fnCached = testee(fn, undefined, {expire: 1000});
			const fnPromisified = promisify(fnCached);
			fnCached.set(1, 123, 1000, new Function());

			return Promise.resolve()
				.then(() => fnPromisified(1))
				.then((response) => expect(response).to.be.equal(123))
				.then(() => expect(count).to.be.equal(0));
		});

		it('`del` method remove cache from storage and force function call early', () => {
			let count = 0;
			const fn = (a, cb) => cb(null, count++);

			const fnCached = testee(fn, undefined, {expire: 1000});
			const fnPromisified = promisify(fnCached);
			const del = promisify(fnCached.del).bind(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified(1))
				.then(() => del(1))
				.then(() => fnPromisified(1))
				.then(() => expect(count).to.be.equal(2));
		});
	});

	describe('multiply wrappers', () => {
		it('data can be shared', () => {
			let counter = 0;

			const fn = async() => counter++;
			const storage = new InMemoryStorageCb();

			const fnCached1 = testeePromise(fn, storage, {expire: 1000, lock: 50});
			const fnCached2 = testeePromise(fn, storage, {expire: 1000, lock: 50});

			return sleep(0)()
				.then(() => fnCached1())
				.then(() => fnCached2())
				.then(() => expect(counter).to.be.equal(1));
		});

		it('data will be present in the long-playing wrapper after it expires in the short-playing', () => {
			let counter = 0;

			const fn = async() => counter++;
			const storage = new InMemoryStorageCb();

			const fnCached1 = testeePromise(fn, storage, {expire: 50, ttl: 1000, lock: 50});
			const fnCached2 = testeePromise(fn, storage, {expire: 1000, ttl: 1000, lock: 50});

			return sleep(0)()
				.then(() => fnCached1())
				.then(() => sleep(150)())
				.then(() => fnCached2())
				.then(() => expect(counter).to.be.equal(1));
		});

		it('no data will be share without proper `ttl` parameter value', () => {
			let counter = 0;

			const fn = async() => counter++;
			const storage = new InMemoryStorageCb();

			const fnCached1 = testeePromise(fn, storage, {expire: 50, ttl: 75, lock: 50});
			const fnCached2 = testeePromise(fn, storage, {expire: 1000, ttl: 1000, lock: 50});

			return sleep(0)()
				.then(() => fnCached1())
				.then(() => sleep(150)())
				.then(() => fnCached2())
				.then(() => expect(counter).to.be.equal(2));
		});

		it('the short-playing wrapper will require updating first', () => {
			let counter = 0;

			const fn = async() => counter++;
			const storage = new InMemoryStorageCb();

			const fnCached1 = testeePromise(fn, storage, {expire: 100, ttl: 1000, lock: 50});
			const fnCached2 = testeePromise(fn, storage, {expire: 1000, ttl: 1000, lock: 50});

			return sleep(0)()
				.then(() => fnCached2())
				.then(() => expect(counter).to.be.equal(1))
				.then(() => sleep(150)())
				.then(() => fnCached2())
				.then(() => fnCached1())
				.then(() => expect(counter).to.be.equal(2));
		});

		it('datum will be present in long-playing wrapper even during updating for short-playing wrapper', () => {
			const storage = new InMemoryStorageCb();
			const LOCK = 500;
			let counter = 0;
			const fn = () => new Promise((resolve, reject) => setTimeout(() => resolve(counter++), LOCK));

			const fnCached1 = testeePromise(fn, storage, {expire: 100, ttl: 1000, lock: LOCK});
			const fnCached2 = testeePromise(fn, storage, {expire: 1000, lock: LOCK});

			return sleep(0)()
				.then(() => fnCached1())
				.then(() => sleep(150)())
				.then(() => {
					const start = Date.now();
					return Promise.all([
						fnCached1(),
						sleep(25)()
							.then(() => fnCached2())
							.then(() => expect(Date.now() - start).to.be.lte(LOCK))
					]);
				})
				.then(() => expect(counter).to.be.equal(2));
		});

		it('ignore error record in short-playing wrapper', () => {
			const storage = new InMemoryStorageCb();
			let counter = 0;
			const fn = () => Promise.reject(new Error(String(counter++)));

			const fnCached1 = testeePromise(fn, storage, {error: 100});
			const fnCached2 = testeePromise(fn, storage, {error: 500});

			return fnCached2()
				.catch((error) => error)
				.then(() => sleep(250)())
				.then(() => fnCached1())
				.catch((error) => error)
				.then(() => fnCached2())
				.catch((error) => error)
				.then((result) => expect(result).to.have.property('message', '1'))
				.then(() => expect(counter).to.be.equal(2));
		});

		it('ignore error record in short-playing wrapper with stale mode', () => {
			const storage = new InMemoryStorageCb();
			let counter = 0;
			const fn = () => Promise.reject(new Error(String(counter++)));

			const fnCached1 = testeePromise(fn, storage, {error: 100, stale: 500});
			const fnCached2 = testeePromise(fn, storage, {error: 500});

			return fnCached2()
				.catch((error) => error)
				.then(() => sleep(250)())
				.then(() => fnCached1())
				.catch((error) => error)
				.then(() => fnCached2())
				.catch((error) => error)
				.then((result) => expect(result).to.have.property('message', '1'))
				.then(() => expect(counter).to.be.equal(2));
		});
	});

	describe('bad source', () => {
		it('timeout error on slow source', () => {
			const fn = (a, cb) => setTimeout(() => cb(null, a), 100);

			const fnCached = testee(fn, undefined, {expire: 1000, source: {timeout: 1}});
			const fnPromisified = promisify(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified(1))
				.catch((error) => error)
				.then((response) => expect(response).to.be.instanceof(Error));
		});
	});

	describe('bad cache', () => {
		it('on result reading from cache storage timeout fail function will called on second run', () => {
			/**
			 * @ignore
			 */
			class InMemoryStorageWithDelayedGet extends InMemoryStorageCb {
				get(key, cb) {
					setTimeout(() => super.get(key, cb), 100);
				}
			}

			let count = 0;
			const fn = (cb) => cb(null, count++);
			const cache = new InMemoryStorageWithDelayedGet();

			const fnCached = testee(fn, cache, {expire: 1000, storage: {timeout: 1}, verbose: 0});
			const fnPromisified = promisify(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(0))
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(1))
				.then(() => expect(count).to.be.equal(2));
		});

		it('on result reading from cache storage fail function will called on second run', () => {
			/**
			 * @ignore
			 */
			class InMemoryStorageErrorReadWrapper extends InMemoryStorageCb {
				get(key, cb) {
					return cb(new Error('get error'));
				}
			}

			const cache = new InMemoryStorageErrorReadWrapper();
			let count = 0;
			const fn = (cb) => cb(null, count++);
			const fnCached = testee(fn, cache, {expire: 1000, verbose: 0});
			const fnPromisified = promisify(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(0))
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(1))
				.then(() => expect(count).to.be.equal(2));
		});

		it('on result saving into cache storage fail function will called on second run', () => {
			/**
			 * @ignore
			 */
			class InMemoryStorageErrorWriteWrapper extends InMemoryStorageCb {
				set(key, value, ttl, cb) {
					return cb(new Error('set error'));
				}
			}

			const cache = new InMemoryStorageErrorWriteWrapper();
			let count = 0;
			const fn = (cb) => cb(null, count++);
			const fnCached = testee(fn, cache, {expire: 1000, verbose: 0});
			const fnPromisified = promisify(fnCached);

			return Promise.resolve()
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(0))
				.then(() => fnPromisified())
				.then((payload) => expect(payload).to.be.equal(1))
				.then(() => expect(count).to.be.equal(2));
		});
	});
});
