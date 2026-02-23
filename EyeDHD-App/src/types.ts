/**
 * Re-exports types from the Electron main process to be accessed easier in the React
 * renderer code.
 */

export { type CSVData } from '../electron/db/tables/csv';
export { type Metadata } from '../electron/db/tables/metadata';
export { type SaccadeData } from '../electron/db/tables/saccade';

export { type DataType, type StreamKey, type StreamType, type Progress } from '../electron/db/DataStream';

export { type Error } from './Error';