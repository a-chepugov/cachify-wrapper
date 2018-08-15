const expect = require('chai').expect;
const tested = require('./index');

describe('random', async function () {

	describe('run', async function () {

		it('is in range', async function () {

			let r = tested(1000, 2000);
			expect(r >= 1000 && r <= 2000).to.equal(true);
		});

	});

});
