/**
 * @template V
 * @typedef {Object} InMemoryStorageRecord
 * @property {any} [value]
 * @property {number} [timestamp]
 * @property {number} [ttl]
 */

/**
 * @template K
 * @template V
 */
class InMemoryStorage {
	/**
	 * @template K
	 * @template V
	 * @typedef {[K, InMemoryStorageRecord<V>]} KRecordTuple
	 */

	/**
	 * @param {Iterable<KRecordTuple<K, V>>} [source]
	 */
	constructor(source) {
		/** @type {Map<K, InMemoryStorageRecord<V>>} */
		this.data = new Map(source);
		/** @type {Map<K, number>} */
		this.timers = new Map();
	}

	/**
	 * @param {K} key
	 */
	get(key) {
		const record = this.data.get(key);
		return record ? record.value : undefined;
	}

	/**
	 * @param {K} key
	 * @param {V} value
	 */
	set(key, value) {
		const record = {value, timestamp: Date.now()};
		this.data.set(key, record);
		return this;
	}

	/**
	 * @param {K} key
	 */
	del(key) {
		this.data.delete(key);
		return this;
	}

	/**
	 * @param {K} key
	 */
	has(key) {
		return this.data.has(key);
	}

	/**
	 * @param {K} key
	 * @param {number} ttl
	 */
	expire(key, ttl) {
		clearTimeout(this.timers.get(key));
		if (Number.isFinite(ttl) && ttl >= 0) {
			const record = this.data.get(key);
			if (typeof record === 'object') {
				record.ttl = ttl;
			}
			this.data.set(key, record);
			const timer = setTimeout(this.del.bind(this), ttl, key, ttl);
			/** @ts-ignore */
			this.timers.set(key, timer);
		}
		return this;
	}

	clear() {
		this.data.clear();
		return this;
	}

	keys() {
		return Array.from(this.data.keys());
	}

	export() {
		return Array.from(this.data[Symbol.iterator]());
	}

	/**
	 * @param {Array<KRecordTuple<K, V>>} dump
	 */
	import(dump) {
		if (Array.isArray(dump)) {
			const now = Date.now();

			dump
				.forEach(([key, record]) => {
					const {ttl, timestamp} = record;

					if (ttl) {
						if (now < ttl + timestamp) {
							this.data.set(key, record);
							this.expire(key, ttl);
						} else {
							// игнорируем просроченную запись
						}
					} else {
						this.data.set(key, record);
					}
				});
			return this;
		} else {
			throw new Error('Argument must be an array');
		}
	}
}

exports.InMemoryStorage = InMemoryStorage;
exports.default = InMemoryStorage;
