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
module.exports = (promise, timeout, error) =>
	Promise.race([
		promise,
		new Promise((resolve, reject) => {
			const id = setTimeout(() => {
				clearTimeout(id);
				reject(error);
			}, timeout);
		})
	]);
