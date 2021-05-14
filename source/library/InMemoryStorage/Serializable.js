const {InMemoryStorage, KRecordTuple} = require('./index.js');

/**
 * @template K
 * @template V
 * @extends {InMemoryStorage<K, V>}
 */
class InMemoryStorageSerializable extends InMemoryStorage {
	/**
	 * @param {K} key
	 * @param {number} ttl
	 */
	expire(key, ttl) {
		if (this._data.has(key)) {
			if (Number.isFinite(ttl)) {
				const record = this._data.get(key);
				record.ttl = ttl;
				this._data.set(key, record);
			}
			return super.expire(key, ttl);
		} else {
			return this;
		}
	}

	/**
	 * @return {Iterable<KRecordTuple<K, V>>}
	 */
	export() {
		return this._data[Symbol.iterator]();
	}

	/**
	 * @param {Iterable<KRecordTuple<K, V>>} dump
	 */
	import(dump) {
		if (dump && typeof dump[Symbol.iterator] === 'function') {
			const now = Date.now();

			for (const item of dump) {
				const [key, record] = item;
				const {value, ttl, timestamp} = record;

				if (ttl) {
					if (now < ttl + timestamp) {
						this._data.set(key, {value, timestamp});
						this.expire(key, ttl + timestamp - now);
					} else {
						// игнорируем просроченную запись
					}
				} else {
					this._data.set(key, record);
				}
			}
			return this;
		} else {
			throw new Error('Argument must be an array');
		}
	}
}

exports.InMemoryStorageSerializable = InMemoryStorageSerializable;
exports.default = InMemoryStorageSerializable;
