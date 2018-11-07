const expect = require('chai').expect;
const tested = require('./index');

describe('timeout', () => {

	describe('run', () => {
		const getPromise = (timeout) => new Promise((resolve) => setTimeout(() => resolve(1), timeout));

		it('promise', () => expect(tested(getPromise(50), 50)).to.be.an.instanceof(Promise));

		it('resolve', () => tested(getPromise(50), 100).then((payload) => expect(payload).to.be.equal(1)));

		it('reject', () => tested(getPromise(50), 1, 'some text').catch((error) => error).then((payload) => expect(payload).to.equal('some text')));

	});

});
