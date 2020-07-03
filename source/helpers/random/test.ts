import {expect} from 'chai';
import tested from './index';

describe('random', async function () {

	it('is in range', async function () {

		let random = tested(1000, 2000);
		expect(1000 <= random && random <= 2000).to.equal(true);
	});

});
