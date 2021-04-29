/**
 * @ignore
 * @param {number} a
 * @param {number} b
 * @return {number} random number between `a` and `b`
 */
exports.default = (a, b) => Math.floor((Math.random() * (b - a)) + a);
