type CB<ARGS extends any[], RESULT> = (...args: ARGS) => RESULT;

type Action<CB_ARGS extends any[], CB_RESULT, A_ARGS extends any[], A_RESULT> = (callback: CB<CB_ARGS, CB_RESULT>, ...args: A_ARGS) => A_RESULT;

export default class Next<CB_ARGS extends any[], CB_RESULT, A_ARGS extends any[], A_RESULT> {
	action: Action<CB_ARGS, CB_RESULT, A_ARGS, A_RESULT>;

	constructor(action: Action<CB_ARGS, CB_RESULT, A_ARGS, A_RESULT>) {
		this.action = action;
	}

	static of(...args: any[]) {
		return new Next((callback: CB<typeof args, any>) => callback(...args));
	}

	execute(callback?: CB<CB_ARGS, CB_RESULT>, ...args: A_ARGS): A_RESULT {
		return this.action(callback, ...args);
	}

	next<CB_ARGS_2 extends any[]>(layer: (callback: CB<CB_ARGS_2, CB_RESULT>, ...args: CB_ARGS) => any) {
		return new Next((callback2: CB<CB_ARGS_2, CB_RESULT>, ...args0: A_ARGS) => {
			return this.execute((...args1: CB_ARGS) => {
				return layer(callback2, ...args1);
			}, ...args0)
		});
	}

}
