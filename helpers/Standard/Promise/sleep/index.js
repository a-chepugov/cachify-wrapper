/**
 * @name sleep
 * @memberof Standard/Promise
 * @param {Number} timeout
 * @return {Promise<any>}
 */
module.exports = (timeout) =>
	new Promise((resolve) =>
		setTimeout(() => resolve(timeout), timeout)
	);
