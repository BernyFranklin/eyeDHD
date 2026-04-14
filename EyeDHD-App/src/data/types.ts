/**
 * Rexports types commonly used by the frontend from the electron and data directories,
 * as well as a custom Error type.
 */

export { type UserData } from '@electron/db/tables/UserData';
export { type CaseData, type SegmentInput, type DetectionConfig } from '@electron/db/tables/CaseData';
export { type ConfigProfile, type ConfigProfileCreate, type ConfigProfileUpdate } from '@electron/db/tables/ConfigProfile';
export { type TrackingData } from '@electron/db/tables/TrackingData';

export { type DataType, type StreamKey, type StreamType, type Progress } from '@electron/db/DataStream';

export { type Error } from '../Error';