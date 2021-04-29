/**
 * @template V
 * @typedef {Object} InMemoryStorageRecord
 * @property {V} [value]
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
		/**
		 * @ignore
		 * @type {Map<K, InMemoryStorageRecord<V>>}
		 */
		this._data = new Map(source);
		/**
		 * @ignore
		 * @type {Map<K, number>}
		 */
		this._timers = new Map();
	}

	/**
	 * @param {K} key
	 */
	get(key) {
		const record = this._data.get(key);
		return record ? record.value : undefined;
	}

	/**
	 * @param {K} key
	 * @param {V} value
	 */
	set(key, value) {
		const record = {value, timestamp: Date.now()};
		this._data.set(key, record);
		return this;
	}

	/**
	 * @param {K} key
	 */
	del(key) {
		this._data.delete(key);
		return this;
	}

	/**
	 * @param {K} key
	 */
	has(key) {
		return this._data.has(key);
	}

	/**
	 * @param {K} key
	 * @param {number} ttl
	 */
	expire(key, ttl) {
		if (this._timers.has(key)) {
			clearTimeout(this._timers.get(key));
		}
		if (Number.isFinite(ttl)) {
			const record = this._data.get(key);
			if (typeof record === 'object' && record) {
				record.ttl = ttl;
			}
			this._data.set(key, record);
			const timer = setTimeout(this.del.bind(this), ttl, key, ttl);
			/**
			 * @ignore
			 * @ts-ignore
			 */
			this._timers.set(key, timer);
		}
		return this;
	}

	clear() {
		this._data.clear();
		return this;
	}

	keys() {
		return this._data.keys();
	}
}

exports.InMemoryStorage = InMemoryStorage;
exports.default = InMemoryStorage;
