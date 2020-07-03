import {Strategy, StrategyConstructor, CB} from "./Interfaces";

export {Strategy, StrategyConstructor, CB} from "./Interfaces";

import sleep from "./helpers/sleep";

export class SYNC<T> implements Strategy<T> {
	protected readonly fn: (...args: any[]) => T;
	protected options: { timeout?: number };

	constructor(fn: (...args: any[]) => T, options: { timeout?: number }) {
		this.fn = fn;
		this.options = options;
		return this;
	}

	args(...args: any[]) {
		return this;
	}

	reveal(error: any, result?: T) {
		if (error) {
			throw error;
		} else {
			return result;
		}
	};

	execute = (cb: CB<any>) => {
		const fn = this.fn;

		return function (...args: Parameters<typeof fn>) {
			try {
				return cb.call(this, undefined, fn.apply(this, args));
			} catch (error) {
				return cb.call(this, error);
			}
		}
	};
}

export class CALLBACK<T> implements Strategy<T> {
	protected readonly fn: (...args: any[]) => any;
	protected options: { timeout?: number };
	protected callback: (...args: any[]) => any;

	constructor(fn: (...args: any[]) => any, options: { timeout?: number }) {
		this.fn = fn;
		this.options = options;
		return this;
	}

	args(...args: any[]) {
		this.callback = args[args.length - 1];
		return this;
	}

	reveal(error: any, result?: T) {
		return this.callback(error, result);
	};

	execute = (cb: CB<any>) => {
		const timeout = this.options?.timeout;
		const fn = this.fn;

		return function (...args: Parameters<typeof fn>) {
			let intact = true;

			if (Number.isFinite(timeout)) {
				sleep(timeout)()
					.then(() => {
						if (intact) {
							intact = false;
							cb.call(this, Error(`Interrupted due to timeout: ${timeout}`));
						}
					});
			}

			return fn.apply(
				this,
				Array.prototype.slice.call(args, 0, args.length - 1).concat([(error: any, result: T) => {
					if (intact) {
						intact = false;
						cb.call(this, error, result);
					}
				}]))
		}
	};
}

export class ASYNC<T> implements Strategy<T> {
	protected readonly fn: (...args: any[]) => any;
	protected options: { timeout?: number };

	constructor(fn: (...args: any[]) => any, options: { timeout?: number }) {
		this.fn = fn;
		this.options = options;
		return this;
	}

	args(...args: any[]) {
		return this;
	}

	reveal(error: any, result?: T) {
		return error ? Promise.reject(error) : Promise.resolve(result);
	};

	execute = (cb: CB<any>) => {
		const timeout = this.options?.timeout;
		const fn = this.fn;

		return function (...args: Parameters<typeof fn>) {
			const work = new Promise((resolve, reject) => {
				try {
					resolve(fn.apply(this, args));
				} catch (error) {
					reject(error);
				}
			});

			return (Number.isFinite(timeout) ?
					Promise.race([
						sleep(timeout)().then(() => {
							throw new Error(`Interrupted due to timeout: ${timeout}`);
						}),
						work
					]) :
					work
			)
				.then(
					(response: any) => cb.call(this, undefined, response),
					(error: any) => cb.call(this, error)
				)
		}
	};
}
