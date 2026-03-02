export type Error = UIError | ElectronError;

/**
 * Represents errors that occur within the user interface, such as form validation errors,
 * user input errors, or any other issues that are directly related to the frontend logic.
 */
interface UIError {
	message: string
}

/**
 * Represents errors originating from the backend that occur during Electron operations,
 * and have been sent to the frontend such as file system access or IPC communication.
 */
interface ElectronError {
	message: string
}