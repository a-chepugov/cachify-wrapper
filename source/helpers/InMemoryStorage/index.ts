'use strict';

type Record<V> = { value: V, timestamp: number, ttl?: number };

export default class InMemoryStorage<K, V> {
	protected readonly data: Map<K, Record<V>>;
	protected readonly timers: Map<K, number>;

	constructor(source?: Iterable<readonly [K, Record<V>]>) {
		this.data = new Map(source);
		this.timers = new Map();
	}

	set(key: K, value: V) {
		const record = {value, timestamp: Date.now()};
		this.data.set(key, record);
		return this;
	}

	has(key: K) {
		return this.data.has(key);
	}

	get(key: K) {
		const record = this.data.get(key);
		return record ? record.value : undefined;
	}

	del(key: K, ttl?: number) {
		this.data.delete(key);
		return this;
	}

	expire(key: K, ttl: number) {
		clearTimeout(this.timers.get(key));
		if (Number.isFinite(ttl)) {
			const record = this.data.get(key);
			if (typeof record === 'object') {
				record.ttl = ttl;
			}
			this.data.set(key, record);
			const timer = setTimeout(this.del.bind(this), ttl, key, ttl) as unknown as number;
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

	import(dump: Array<[K, Record<V>]>) {
		if (Array.isArray(dump)) {
			const now = Date.now();

			dump
				.forEach(([key, record]: [K, Record<V>]) => {
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
		return this;
	}
};
