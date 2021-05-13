/**
 * @ignore
 * @description Converts function into `callback-last / error-first` style function
 * @param {function} fn
 * @return {function}
 */
function callbackify(fn) {
	return function() {
		const cb = Array.prototype.slice.call(arguments, -1)[0];
		return Promise
			.resolve(Array.prototype.slice.call(arguments, 0, -1))
			.then((args) => fn.apply(this, args))
			.then((response) => cb(null, response), cb);
	};
}

exports.default = callbackify;
