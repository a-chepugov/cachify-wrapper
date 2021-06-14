const {expect} = require('chai');
const Testee = require('./Serializable.js').default;
const sleep = require('../sleep.js').default;

describe('Serializable', function() {
	it('export', async function() {
		const dump = new Testee()
			.set(1, 1)
			.set(2, 2)
			.set({q: 3}, {q: 'q'})
			.export();
		expect(Array.from(dump).length).to.equal(3);
	});

	it('export. skip expired', async function() {
		const i = new Testee()
			.set(1, 1)
			.expire(1, 50);
		expect(Array.from(i.keys()).length).to.equal(1);

		return sleep(100)()
			.then(() => expect(Array.from(i.export()).length).to.equal(0));
	});

	it('import', async function() {
		const now = Date.now();
		const dump = [
			[1, {value: 1, timestamp: now - 50}],
			[2, {value: 2, timestamp: now - 500}],
			[3, {value: 3, timestamp: now - 50}],
		];
		const i = new Testee().import(dump);
		expect(Array.from(i.keys()).length).to.equal(3);
	});

	it('import. skip expired', async function() {
		const now = Date.now();
		const dump = [
			[1, {value: 1, timestamp: now - 100, ttl: 50}],
		];
		const i = new Testee().import(dump);
		expect(i.get(1)).to.equal(undefined);
		expect(Array.from(i.keys()).length).to.equal(0);
	});

	it('import. remove imported after expired period', async function() {
		const now = Date.now();

		const dump = [
			[1, {value: 1, timestamp: now - 100, ttl: 150}],
		];
		const i = new Testee().import(dump);

		expect(i.get(1)).to.equal(1);
		return sleep(100)()
			.then(() => expect(Array.from(i.keys()).length).to.equal(0));
	});

	it('import exported', async function() {
		const dump = new Testee()
			.set(1, 1)
			.expire(1, 0)
			.set(2, 2)
			.expire(2, 100)
			.set(3, 3)
			.expire(3, 200)
			.set(4, 4)
			.expire(4, Infinity)
			.export();

		return Promise.resolve()
			.then(sleep(100))
			.then(() => new Testee().import(dump))
			.then((i) => {
				expect(Array.from(i.keys()).length).to.equal(2);
				return i;
			})
			.then(sleep(100))
			.then((i) => expect(Array.from(i.keys()).length).to.equal(1));
	});
});
