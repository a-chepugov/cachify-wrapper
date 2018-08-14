const {
	Standard: {
		Map: {InMemoryStorage},
	}
} = require("helpers-js");

const cachify = require("./source/cachify");
const Aggregator = require("lazy-aggregator");

const cache = new InMemoryStorage();

const sourceFunc = (a) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve({data: a}), 2000)
	})
};

const sourceFunc2 = (a) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve({data: a * 2}), 1000)
	})
};

// const options = {expire: 5000, lock: {timeout: 1000, placeholder: '???'}, stale: {lock: 1000}};
const options = {expire: {ttl: 5000}, lock: {timeout: 5000, placeholder: '???'}, latency: 1000, retries: 3}
const source = {a: sourceFunc, b: sourceFunc2};

const handler = (key, value) => {
	options.prefix = `q->${key}`;
	return cachify(value, cache, options);
};

let q = new Aggregator(handler, source);

q.a(123);
q.b(222);
q.b(333);
q.b(222);


setTimeout(() => {
	console.log('DEBUG:index.js():104 =>');
	console.dir(cache, {colors: true, depth: null});
}, 2500);
