export default (timeout: number) =>
	(value?: any) =>
		new Promise((resolve) => setTimeout((value) => resolve(value), timeout, value));
