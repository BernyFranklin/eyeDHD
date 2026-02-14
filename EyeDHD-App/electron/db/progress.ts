export default {};

export type StreamProgress = {
	name: string;
	requested: number;
	completed: boolean;
};


export type CleaningProgress = {
	name: string;
	cleaned: number;
	completed: boolean;
}