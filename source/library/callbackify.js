/**
 * @ignore
 * @description Converts promise returning function into `callback-last / error-first` style function
 * @param {function(): Promise<*>} fn
 * @return {function}
 */
function callbackify(fn) {
	return function() {
		const cb = arguments[arguments.length - 1];
		return fn
			.apply(this, Array.prototype.slice.call(arguments, 0, -1))
			// @ts-ignore
			.then((response) => cb(null, response), cb);
	};
}

exports.default = callbackify;
