export type Error = UIError | ElectronError;

interface UIError {
	message: string
}

interface ElectronError {
	message: string
}