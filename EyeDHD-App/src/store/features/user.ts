import { type Metadata } from '../../types';

interface Options {
	stuff: void;
}

interface User {
	dir: string;
	options: Options;
	cases: Metadata[];
	selectedCase?: Metadata;
}