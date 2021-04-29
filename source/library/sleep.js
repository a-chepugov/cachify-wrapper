exports.default = (timeout) => (value) => new Promise((resolve) => setTimeout(resolve, timeout, value));
