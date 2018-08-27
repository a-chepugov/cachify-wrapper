const expect = require('chai').expect;
const tested = require('./index');

describe('timeout', async function () {

	describe('run', async function () {
		const promise = new Promise((resolve) => setTimeout(() => resolve(1), 50));

		it('promise', async function () {
			expect(tested(promise, 50)).to.be.an.instanceof(Promise);
		});

		it('resolve', async () => tested(promise, 100).then((payload) => expect(payload).to.be.equal(1)));

		it('reject', async () => tested(promise, 1).catch(() => expect(true).to.equal(true)));
	});

});
