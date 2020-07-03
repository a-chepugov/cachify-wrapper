export type CB<T> = (error: any, result?: T) => any;

export interface Strategy<T> {

	args(...args: any[]): this;

	reveal(error: any, result?: any): any;

	execute: (cb: CB<T>) => (...args: any[]) => any;
}

export interface StrategyConstructor<T> {
	new(fn: (...args: any[]) => any, options: { timeout?: number }): Strategy<T>;
}

export interface CacheStorage<K, V> {
	get(key: K): any;

	set(key: any, value: V, ttl: number): any;
}
