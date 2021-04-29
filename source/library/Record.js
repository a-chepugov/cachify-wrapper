/**
 * @ignore
 * @template V
 */
class Record {
	get error() {
		return this._error;
	}

	/**
	 * @param {Error} value
	 */
	set error(value) {
		this._error = value;
	}

	get value() {
		return this._value;
	}

	/**
	 * @param {V} value
	 */
	set value(value) {
		this._value = value;
	}

	get timestamp() {
		return this._timestamp;
	}

	/**
	 * @param {number} value
	 */
	set timestamp(value) {
		this._timestamp = value;
	}

	get lock() {
		return this._lock;
	}

	/**
	 * @param {boolean} value
	 */
	set lock(value) {
		this._lock = value;
	}

	pack() {
		/** @type {RecordPacked<V>} */
		const pack = {};

		if (this.error) pack.e = this.error.message;
		if (this.value !== undefined) pack.v = this.value;
		if (this.timestamp) pack.t = this.timestamp;
		if (this.lock) pack.l = this.lock;
		return pack;
	}

	/**
 	 * @template V0
	 * @param {Error} error
	 * @return {Record<V0>}
	 */
	static error(error) {
		/** @type {Record<V0>} */
		const record = new Record();
		record.error = error;
		record.timestamp = Date.now();
		return record;
	}

	/**
 	 * @template V0
	 * @param {V0} value
	 * @return {Record<V0>}
	 */
	static of(value) {
		const record = new Record();
		record.value = value;
		record.timestamp = Date.now();
		return record;
	}

	/**
 	 * @template V0
	 * @param {Error} [error]
	 * @param {V0} [value]
	 * @return {Record<V0>}
	 */
	static locked(error, value) {
		const record = new Record();
		record.error = error;
		record.value = value;
		record.timestamp = Date.now();
		record.lock = true;
		return record;
	}

	/**
 	 * @template V0
	 * @param {RecordPacked<V0>} pack
	 * @return {Record<V0>}
	 */
	static unpack(pack = {}) {
		const record = new Record();
		if (pack.e) record.error = new Error(pack.e);
		if (pack.v !== undefined) record.value = pack.v;
		if (pack.t) record.timestamp = pack.t;
		if (pack.l) record.lock = pack.l;

		return record;
	}
}

exports.Record = Record;
exports.default = Record;

/**
 * @ignore
 * @template V
 * @typedef {Object} RecordPacked
 * @property {string} [e]
 * @property {V} [v]
 * @property {number} [t]
 * @property {boolean} [l]
 */
