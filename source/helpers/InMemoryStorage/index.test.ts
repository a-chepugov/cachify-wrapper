import {expect} from 'chai';

import Class from './index';

describe('InMemoryStorage', function () {

	it('set & get & has', async function () {
		const i = new Class<any, any>();
		i.set(1, {q: 'q'});
		expect(i.get(1)).to.deep.equal({q: 'q'});
		expect(i.has(1)).to.deep.equal(true);

		expect(i.get(2)).to.deep.equal(undefined);
		expect(i.has(2)).to.deep.equal(false);

	});

	it('del', async function () {
		const i = new Class();
		i.set(1, 123);
		expect(i.get(1)).to.equal(123);
		i.del(1);
		expect(i.get(1)).to.equal(undefined);
	});

	it('expire', async function () {
		const i = new Class();
		i.set(1, {q: 'q'});
		i.expire(1, 10);
		return new Promise((resolve) => setTimeout(() => resolve(i.get(1)), 25))
			.then((result) => expect(result).to.equal(undefined));
	});

	it('clear', async function () {
		const i = new Class();
		i.set(1, {qqq: 'qqq'});
		i.clear();
		const keys = i.keys();
		expect(Array.isArray(keys) && keys.length === 0).to.equal(true);
	});

	it('export', async function () {
		const i = new Class();
		i.set(1, 1);
		i.set(2, 2);
		i.expire(2, 25);
		i.set({q: 3}, {q: 'q'});
		let dump = i.export();
		expect(dump.length).to.equal(3);
	});

	it('import', async function () {
		const i = new Class();
		const now = Date.now();
		const dump = [
			[1, {value: 1, timestamp: now - 50}],
			[2, {value: 2, timestamp: now - 50, ttl: 100}],
			[3, {value: 3, timestamp: now - 50, ttl: 25}],
		];
		// @ts-ignore
		i.import(dump);
		const keys = i.keys();
		expect(keys.length).to.equal(2);
	});

	it('import. expire', async function () {
		const i = new Class();

		const now = Date.now();

		const dump = [
			[1, {value: 1, timestamp: now - 50}],
			[2, {value: 2, timestamp: now - 50, ttl: 100}],
			[3, {value: 3, timestamp: now - 50, ttl: 25}],
		];
		// @ts-ignore
		i.import(dump);
		expect(i.get(1)).to.equal(1);
		expect(i.get(2)).to.equal(2);
		expect(i.get(3)).to.equal(undefined);
	});

	it('import. expire old', async function () {
		const i = new Class();
		const now = Date.now();

		const dump = [
			[1, {value: 1, timestamp: now - 10, ttl: 20}],
		];
		// @ts-ignore
		i.import(dump);

		expect(i.get(1)).to.equal(1);
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(i.get(1)).to.equal(undefined);
				resolve();
			}, 25);
		});
	});
});
