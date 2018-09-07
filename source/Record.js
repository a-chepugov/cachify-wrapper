module.exports = class Record {
	set timestamp(value) {
		this.t = value;
	}

	get timestamp() {
		return this.t;
	}

	set value(value) {
		this.v = value;
	}

	get value() {
		return this.v;
	}

	set stale(value) {
		this.s = value;
	}

	get stale() {
		return this.s;
	}

	set lock(value) {
		this.l = value;
	}

	get lock() {
		return this.l;
	}

	isLocked() {
		return !!(this.lock);
	}

	static of(value, timestamp) {
		const record = new Record();
		record.value = value;
		if (timestamp) {
			record.timestamp = timestamp;
		}
		return record;
	}

	static lock(lock) {
		const record = new Record();
		record.lock = lock;
		return record;
	}

	static from(obj = {}) {
		const record = new Record();
		({
			v: record.value,
			t: record.timestamp,
			l: record.lock,
			s: record.stale
		} = obj);
		return record;
	}
};
