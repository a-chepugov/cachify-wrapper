const {FN, CB} = require('../Interfaces.js');

/**
 * @description timeout error
 */
class TIMEOUT_ERROR extends Error {
	/**
	 * @param {string} message
	 * @param {number} timeout
	 */
	constructor(message, timeout) {
		super(message);
		this.timeout = timeout;
	}
}

exports.TIMEOUT_ERROR = TIMEOUT_ERROR;

/**
 * @ignore
 * @param {FN} fn
 * @param {number} timeout
 */
function timeout(fn, timeout) {
	/** @ts-ignore */
	return (...args) => {
		/** @type {CB<any>} */
		const cb = args.pop();
		let unrunned = true;
		/** @type {any} */
		let timer;
		if (Number.isFinite(timeout)) {
			timer = setTimeout(() => {
				if (unrunned) {
					unrunned = false;
					cb(new TIMEOUT_ERROR('TIMEOUT_ERROR', timeout), null);
					clearTimeout(timer);
				}
			}, timeout);
		}
		fn(...args,
			/**
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

exports.timeout = timeout;
exports.default = timeout;
