export default class RemoteStream<T> {
	private buf: T[] = [];
	type: string;

	constructor(type: string) {
		this.type = type;
	}
}
