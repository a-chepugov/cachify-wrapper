const {expect} = require('chai');
const Testee = require('./index.js').default;

describe('InMemoryStorage', function() {
	it('set & get & has', async function() {
		const i = new Testee()
			.set(1, {q: 'q'});
		expect(i.has(1)).to.be.deep.equal(true);
		expect(i.get(1)).to.be.deep.equal({q: 'q'});
	});

	it('set & get & has of undefined', async function() {
		const i = new Testee();
		expect(i.has(1)).to.be.deep.equal(false);
		expect(i.get(1)).to.be.deep.equal(undefined);
	});

	it('del', async function() {
		const i = new Testee()
			.set(1, 123)
			.del(1);
		expect(i.get(1)).to.be.equal(undefined);
	});

	it('expire', async function() {
		const i = new Testee()
			.set(1, {q: 'q'})
			.expire(1, 10);
		return new Promise((resolve) => setTimeout(() => resolve(i.get(1)), 25))
			.then((result) => expect(result).to.be.equal(undefined));
	});

	it('keys', async function() {
		const i = new Testee()
			.set(1, 1)
			.set(2, 2);
		expect(Array.from(i.keys()).length).to.be.equal(2);
	});

	it('clear', async function() {
		const i = new Testee()
			.set(1, {qqq: 'qqq'})
			.clear();
		expect(Array.from(i.keys()).length).to.be.equal(0);
	});
});
