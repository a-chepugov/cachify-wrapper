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

	set placeholder(value) {
		this.p = value;
	}

	get placeholder() {
		return this.p;
	}

	isPlaceholder() {
		return !!(this.placeholder);
	}

	static of(value, timestamp) {
		const record = new Record();
		record.value = value;
		if (timestamp) {
			record.timestamp = timestamp;
		}
		return record;
	}

	static placeholder(placeholder, timestamp) {
		const record = new Record();
		record.placeholder = placeholder;
		if (timestamp) {
			record.timestamp = timestamp;
		}
		return record;
	}

	static from(obj = {}) {
		const record = new Record();
		({
			t: record.timestamp,
			p: record.placeholder,
			v: record.value,
			s: record.stale
		} = obj);
		return record;
	}
};
