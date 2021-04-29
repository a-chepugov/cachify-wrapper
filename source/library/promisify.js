/**
 * @ignore
 * @param {function} fn - `callback-last / error-first` style function
 * @return {function(): Promise<*>}
 */
function promisify(fn) {
	return function() {
		return new Promise((resolve, reject) => {
			try {
				fn.apply(
					this,
					Array.prototype
						.slice.call(arguments)
						// @ts-ignore
						.concat((error, response) => error ? reject(error) : resolve(response)));
			} catch (error) {
				reject(error);
			}
		});
	};
}

exports.default = promisify;
