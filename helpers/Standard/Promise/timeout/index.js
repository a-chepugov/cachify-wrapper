'use strict';

/**
 * Wrap promise with a timeout
 * @name timeout
 * @memberof Standard/Promise
 * @param {Promise} promise - promise needs to be to resolve
 * @param {Number} timeout - time interval in milliseconds before reject will be raised
 * @param {Error} error - error with which reject will be raised
 * @return {Promise}
 */
module.exports = (promise, timeout, error) => {
	let id;
	return Promise.race(
		[
			promise,
			new Promise((resolve, reject) => id = setTimeout(() => reject(error), timeout))
		]
	)
		.then((result) => {
			clearTimeout(id);
			return result;
		})
		.catch((error) => {
			clearTimeout(id);
			throw error;
		});
};
