export interface RecordData<V> {
	v?: V;
	t?: number;
	l?: number;
}

export class Record<V> implements RecordData<V>{
	v: V; // value
	t: number; // timestamp
	l: number; // lock timestamp

	set timestamp(value: number) {
		this.t = value;
	}

	get timestamp() {
		return this.t;
	}

	set value(value: V) {
		this.v = value;
	}

	get value(): V {
		return this.v;
	}

	set lock(value: number) {
		this.l = value;
	}

	get lock(): number {
		return this.l;
	}

	static of<V0>(value: V0): Record<V0> {
		const record = new Record<V0>();
		record.value = value;
		record.timestamp = Date.now();
		return record;
	}

	static lock(lock: number) {
		const record = new Record();
		record.lock = lock;
		return record;
	}

	static from<T>(source: RecordData<T> = {}): Record<T> {
		const record = new Record<T>();
		({
			v: record.value,
			t: record.timestamp,
			l: record.lock,
		} = source);
		return record;
	}
};

export default Record;
