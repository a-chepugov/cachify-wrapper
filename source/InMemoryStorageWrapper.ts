import InMemoryStorage from './helpers/InMemoryStorage';
import {CacheStorage} from './Interfaces';

export class InMemoryStorageWrapper<K, V> implements CacheStorage<K, V> {
	protected cache: InMemoryStorage<K, V>;

	constructor() {
		this.cache = new InMemoryStorage<K, V>();
	}

	set(key: K, value: V, expire: number) {
		this.cache.set(key, value);
		if (expire) {
			this.cache.expire(key, expire);
		}
	}

	get(key: K) {
		return this.cache.get(key);
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}
}

export default InMemoryStorageWrapper;
