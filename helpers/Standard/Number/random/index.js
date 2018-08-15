'use strict';

/**
 * Returns random number between `a` and `b`
 * @name random
 * @memberof Standard/Number
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 */
module.exports = (a, b) => {
	a =
		Number.isFinite(a) ?
			a :
			Number.MIN_SAFE_INTEGER;

	b =
		Number.isFinite(b) ?
			b :
			Number.MAX_SAFE_INTEGER;

	return Math.floor((Math.random() * (b - a)) + a);
};
