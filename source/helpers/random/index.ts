/**
 * Returns random number between `a` and `b`
 */
export default (a: number, b: number) => {
	a =
		Number.isFinite(a) ?
			a :
			Number.MIN_SAFE_INTEGER;

	b =
		Number.isFinite(b) ?
			b :
			Number.MAX_SAFE_INTEGER;

	return Math.floor((Math.random() * (b - a)) + a);
};
