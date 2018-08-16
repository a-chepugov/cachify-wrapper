'use strict';

/**
 * @name InMemoryStorage
 * @memberof Standard/Map
 * @constructor
 * @param {Iterable} source - iterable source of key-value pairs
 */
module.exports = class {
	constructor(source) {
		this.__data = new Map(source);
	}

	/**
	 * @param {*} key
	 * @param {*} value
	 */
	set(key, value) {
		const record = {value, timestamp: Date.now()};
		this.__data.set(key, record);
	}

	/**
	 * @param {*} key
	 * @return {Boolean}
	 */
	has(key) {
		return this.__data.has(key);
	}

	/**
	 *
	 * @param {*} key
	 * @return {*|undefined}
	 */
	get(key) {
		const record = this.__data.get(key);
		return record ? record.value : undefined;
	}

	/**
	 * @param {*} key
	 * @return {Boolean}
	 */
	del(key) {
		return this.__data.delete(key);
	}

	/**
	 *
	 * @param {*} key
	 * @param {Number} expire - expire time in milliseconds
	 */
	expire(key, expire) {
		const record = this.__data.get(key);
		if (typeof record === 'object') {
			record.till = Date.now() + expire;
		}
		this.__data.set(key, record);
		setTimeout(this.del.bind(this), expire, key);
	}

	clear() {
		return this.__data.clear();
	}

	keys() {
		return Array.from(this.__data.keys());
	}

	export() {
		return Array.from(this.__data[Symbol.iterator]());
	}

	import(dump) {
		if (Array.isArray(dump)) {
			dump
				.forEach(([key, record] = []) => {
					const {till} = record;

					if (till) {
						if (Date.now() < till) {
							this.__data.set(key, record);
							this.expire(key, Date.now() - till);
						} else {
							// игнорируем просроченную запись
						}
					} else {
						this.__data.set(key, record);
					}
				});
		} else {
			throw new Error('Argument must be an array');
		}
	}
};
