const {CB} = require('../Interfaces/Functions.js');

/**
 * @ignore
 * @description timeout error
 */
class TimeoutError extends Error {
}

exports.TimeoutError = TimeoutError;

/**
 * @ignore
 * @param {function(...*): *} fn
 * @param {number} delay
 * @return {function(...*): *} - `callback-last` style function
 */
function timeout(fn, delay) {
	/**
	 * @ignore
	 * @ts-ignore
	 */
	return function() {
		/**
		 * @ignore
		 * @type {CB<*>}
		 */
		const cb = Array.prototype.slice.call(arguments, -1)[0];
		/**
		 * @ignore
		 */
		const args = Array.prototype.slice.call(arguments, 0, -1);

		let unrunned = true;
		/**
		 * @ignore
		 * @type {*}
		 */
		let timer;
		if (Number.isFinite(delay)) {
			timer = setTimeout(() => {
				if (unrunned) {
					unrunned = false;
					cb(new TimeoutError(String(delay)), null);
					clearTimeout(timer);
				}
			}, delay);
		}
		/**
		 * @ignore
		 */
		fn.call(this, ...args,
			/**
			 * @ignore
			 * @param {Error} error
			 * @param {*} result
			 */
			(error, result) => {
				if (unrunned) {
					unrunned = false;
					cb(error, result);
					if (Number.isFinite(timer)) {
						clearTimeout(timer);
					}
				}
			});
	};
}

exports.default = timeout;
