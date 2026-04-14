import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

import { Button } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import { useSelector, useDispatch } from '@src/data/hooks';
import { selectSelectedCase, setSelectedCase } from '@src/data/features/user';
import {
	selectProfiles,
	selectProfileStatus,
	loadProfiles,
	createProfile,
	updateProfile,
	deleteProfile,
} from '@src/data/features/profile';
import { parseTimestampToMs, msToTimestamp } from '@src/parseTimestamp';

import type { SegmentInput, DetectionConfig, ConfigProfile } from '@src/data/types';

type EventRow = {
	startText: string;
	endText: string;
};

const DEFAULT_THRESHOLDS: Required<Omit<DetectionConfig, 'amplitudeBounds'>> & {
	amplitudeMin: string;
	amplitudeMax: string;
} = {
	velocityThresholdDegPerSec: 100,
	minDurationMs: 10,
	minInterSaccadeMs: 50,
	amplitudeMin: '',
	amplitudeMax: '',
};

const NO_PROFILE = 0;

export default function CaseConfig() {
	const dispatch = useDispatch();
	const selectedCase = useSelector(selectSelectedCase);
	const profiles = useSelector(selectProfiles);
	const profileStatus = useSelector(selectProfileStatus);

	// Event marker rows
	const [events, setEvents] = useState<EventRow[]>([]);

	// Detection thresholds
	const [velocityThreshold, setVelocityThreshold] = useState(
		DEFAULT_THRESHOLDS.velocityThresholdDegPerSec
	);
	const [minDuration, setMinDuration] = useState(
		DEFAULT_THRESHOLDS.minDurationMs
	);
	const [minInterSaccade, setMinInterSaccade] = useState(
		DEFAULT_THRESHOLDS.minInterSaccadeMs
	);
	const [amplitudeMin, setAmplitudeMin] = useState(
		DEFAULT_THRESHOLDS.amplitudeMin
	);
	const [amplitudeMax, setAmplitudeMax] = useState(
		DEFAULT_THRESHOLDS.amplitudeMax
	);

	const [saving, setSaving] = useState(false);

	// Currently-loaded profile (0 = none / custom)
	const [selectedProfileId, setSelectedProfileId] = useState<number>(NO_PROFILE);

	// Inline name prompt (window.prompt is disabled in Electron renderers)
	const [namePromptOpen, setNamePromptOpen] = useState(false);
	const [namePromptValue, setNamePromptValue] = useState('');
	const [pendingSavePayload, setPendingSavePayload] = useState<{
		segments: SegmentInput[] | null;
		detection_config: DetectionConfig;
	} | null>(null);

	// Load profile list on mount (per-project, pulled from profile:list)
	useEffect(() => {
		if (profileStatus === 'idle') {
			dispatch(loadProfiles());
		}
	}, [profileStatus, dispatch]);

	// Load existing config from the case when it mounts
	useEffect(() => {
		if (!selectedCase) return;

		if (selectedCase.segments && selectedCase.segments.length > 0) {
			setEvents(
				selectedCase.segments.map((seg) => ({
					startText: msToTimestamp(seg.startMs),
					endText: msToTimestamp(seg.endMs),
				}))
			);
		}

		if (selectedCase.detection_config) {
			applyDetectionConfig(selectedCase.detection_config);
		}
	}, [selectedCase?.name]);

	function applyDetectionConfig(cfg: DetectionConfig) {
		if (cfg.velocityThresholdDegPerSec !== undefined)
			setVelocityThreshold(cfg.velocityThresholdDegPerSec);
		if (cfg.minDurationMs !== undefined) setMinDuration(cfg.minDurationMs);
		if (cfg.minInterSaccadeMs !== undefined)
			setMinInterSaccade(cfg.minInterSaccadeMs);
		setAmplitudeMin(
			cfg.amplitudeBounds?.min !== undefined
				? String(cfg.amplitudeBounds.min)
				: ''
		);
		setAmplitudeMax(
			cfg.amplitudeBounds?.max !== undefined
				? String(cfg.amplitudeBounds.max)
				: ''
		);
	}

	function applyProfileToForm(profile: ConfigProfile) {
		setEvents(
			profile.markers.map((seg) => ({
				startText: msToTimestamp(seg.startMs),
				endText: msToTimestamp(seg.endMs),
			}))
		);
		if (profile.detection) {
			applyDetectionConfig(profile.detection);
		} else {
			setVelocityThreshold(DEFAULT_THRESHOLDS.velocityThresholdDegPerSec);
			setMinDuration(DEFAULT_THRESHOLDS.minDurationMs);
			setMinInterSaccade(DEFAULT_THRESHOLDS.minInterSaccadeMs);
			setAmplitudeMin('');
			setAmplitudeMax('');
		}
	}

	const addEvent = () => {
		setEvents([...events, { startText: '', endText: '' }]);
	};

	const removeEvent = (index: number) => {
		setEvents(events.filter((_, i) => i !== index));
	};

	const updateEvent = (
		index: number,
		field: 'startText' | 'endText',
		value: string
	) => {
		const updated = [...events];
		updated[index] = { ...updated[index], [field]: value };
		setEvents(updated);
	};

	const validate = (): {
		segments: SegmentInput[] | null;
		detection_config: DetectionConfig;
	} | null => {
		// Validate event markers
		const segments: SegmentInput[] = [];
		for (let i = 0; i < events.length; i++) {
			const row = events[i];
			const startMs = parseTimestampToMs(row.startText);
			const endMs = parseTimestampToMs(row.endText);

			if (startMs === null) {
				AlertControls.error(
					`Event ${i + 1}: Invalid start timestamp "${row.startText}". Use hh:mm:ss:xx format.`
				);
				return null;
			}
			if (endMs === null) {
				AlertControls.error(
					`Event ${i + 1}: Invalid end timestamp "${row.endText}". Use hh:mm:ss:xx format.`
				);
				return null;
			}
			if (endMs <= startMs) {
				AlertControls.error(
					`Event ${i + 1}: End time must be after start time.`
				);
				return null;
			}

			segments.push({ id: `event-${i + 1}`, startMs, endMs });
		}

		// Validate thresholds
		if (velocityThreshold <= 0) {
			AlertControls.error('Velocity threshold must be greater than 0.');
			return null;
		}
		if (minDuration <= 0) {
			AlertControls.error('Minimum duration must be greater than 0.');
			return null;
		}
		if (minInterSaccade <= 0) {
			AlertControls.error('Refractory period must be greater than 0.');
			return null;
		}

		const amplitudeBounds: DetectionConfig['amplitudeBounds'] = {};
		if (amplitudeMin !== '') {
			const val = Number(amplitudeMin);
			if (isNaN(val) || val < 0) {
				AlertControls.error('Amplitude minimum must be a non-negative number.');
				return null;
			}
			amplitudeBounds.min = val;
		}
		if (amplitudeMax !== '') {
			const val = Number(amplitudeMax);
			if (isNaN(val) || val <= 0) {
				AlertControls.error('Amplitude maximum must be a positive number.');
				return null;
			}
			amplitudeBounds.max = val;
		}
		if (
			amplitudeBounds.min !== undefined &&
			amplitudeBounds.max !== undefined &&
			amplitudeBounds.max <= amplitudeBounds.min
		) {
			AlertControls.error('Amplitude max must be greater than amplitude min.');
			return null;
		}

		const detection_config: DetectionConfig = {
			velocityThresholdDegPerSec: velocityThreshold,
			minDurationMs: minDuration,
			minInterSaccadeMs: minInterSaccade,
			...(Object.keys(amplitudeBounds).length > 0
				? { amplitudeBounds }
				: {}),
		};

		return {
			segments: segments.length > 0 ? segments : null,
			detection_config,
		};
	};

	const save = async () => {
		const result = validate();
		if (!result) return;

		setSaving(true);
		try {
			const updated = await window.electron.case.saveConfig(
				selectedCase,
				result
			);
			dispatch(setSelectedCase(updated));
			AlertControls.success('Configuration saved.');
		} catch (err) {
			AlertControls.error(`Failed to save configuration: ${err}`);
		} finally {
			setSaving(false);
		}
	};

	const handleProfileSelect = (id: number) => {
		setSelectedProfileId(id);
		if (id === NO_PROFILE) return;
		const profile = profiles.find((p) => p.id === id);
		if (!profile) return;
		applyProfileToForm(profile);
	};

	const saveAsNewProfile = () => {
		const result = validate();
		if (!result) return;
		setPendingSavePayload(result);
		setNamePromptValue('');
		setNamePromptOpen(true);
	};

	const cancelNamePrompt = () => {
		setNamePromptOpen(false);
		setPendingSavePayload(null);
		setNamePromptValue('');
	};

	const confirmNamePrompt = async () => {
		const name = namePromptValue.trim();
		if (!name) {
			AlertControls.error('Profile name cannot be empty.');
			return;
		}
		if (!pendingSavePayload) {
			cancelNamePrompt();
			return;
		}

		try {
			const created = await dispatch(
				createProfile({
					name,
					markers: pendingSavePayload.segments ?? [],
					detection: pendingSavePayload.detection_config,
				})
			).unwrap();
			setSelectedProfileId(created.id);
			AlertControls.success(`Profile "${created.name}" saved.`);
			cancelNamePrompt();
		} catch (err) {
			AlertControls.error(`Failed to save profile: ${err}`);
		}
	};

	const overwriteProfile = async () => {
		if (selectedProfileId === NO_PROFILE) return;
		const profile = profiles.find((p) => p.id === selectedProfileId);
		if (!profile) return;

		const result = validate();
		if (!result) return;

		if (
			!window.confirm(
				`Overwrite profile "${profile.name}" with the current configuration?`
			)
		)
			return;

		try {
			await dispatch(
				updateProfile({
					profile,
					updates: {
						markers: result.segments ?? [],
						detection: result.detection_config,
					},
				})
			).unwrap();
			AlertControls.success(`Profile "${profile.name}" updated.`);
		} catch (err) {
			AlertControls.error(`Failed to update profile: ${err}`);
		}
	};

	const removeProfile = async () => {
		if (selectedProfileId === NO_PROFILE) return;
		const profile = profiles.find((p) => p.id === selectedProfileId);
		if (!profile) return;

		if (!window.confirm(`Delete profile "${profile.name}"? This cannot be undone.`))
			return;

		try {
			await dispatch(deleteProfile(profile)).unwrap();
			setSelectedProfileId(NO_PROFILE);
			AlertControls.success(`Profile "${profile.name}" deleted.`);
		} catch (err) {
			AlertControls.error(`Failed to delete profile: ${err}`);
		}
	};

	const hasProfileSelected = selectedProfileId !== NO_PROFILE;

	return (
		<>
			<div className="case-config">
				<div className="config-section">
					<h3 className="config-section-title">Config Profile</h3>
					<p className="config-hint">
						Load a saved set of markers and thresholds, or save the current
						configuration as a reusable profile.
					</p>

					<div className="profile-row">
						<select
							className="config-input profile-select"
							value={selectedProfileId}
							onChange={(e) =>
								handleProfileSelect(Number(e.target.value))
							}
						>
							<option value={NO_PROFILE}>— None (Custom) —</option>
							{profiles.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>

						<button
							className="profile-btn"
							onClick={saveAsNewProfile}
							title="Save current configuration as a new profile"
						>
							Save as New
						</button>
						<button
							className="profile-btn"
							onClick={overwriteProfile}
							disabled={!hasProfileSelected}
							title="Overwrite the selected profile with the current configuration"
						>
							Update
						</button>
						<button
							className="profile-btn profile-btn-danger"
							onClick={removeProfile}
							disabled={!hasProfileSelected}
							title="Delete the selected profile"
						>
							Delete
						</button>
					</div>

					{namePromptOpen && (
						<div className="name-prompt-overlay" onClick={cancelNamePrompt}>
							<div
								className="name-prompt-dialog"
								onClick={(e) => e.stopPropagation()}
							>
								<label className="name-prompt-label">
									Name for this profile
									<input
										type="text"
										className="config-input"
										autoFocus
										value={namePromptValue}
										onChange={(e) =>
											setNamePromptValue(e.target.value)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter') confirmNamePrompt();
											if (e.key === 'Escape') cancelNamePrompt();
										}}
									/>
								</label>
								<div className="name-prompt-actions">
									<button
										className="profile-btn"
										onClick={cancelNamePrompt}
									>
										Cancel
									</button>
									<button
										className="profile-btn"
										onClick={confirmNamePrompt}
									>
										Save
									</button>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="config-section">
					<h3 className="config-section-title">Event Markers</h3>
					<p className="config-hint">
						Define time windows to analyze individually. Timestamps use
						hh:mm:ss:xx format.
					</p>

					{events.map((row, i) => (
						<div className="event-row" key={i}>
							<span className="event-label">Event {i + 1}</span>
							<label className="event-field">
								Start
								<input
									type="text"
									className="config-input timestamp-input"
									placeholder="00:00:00:00"
									value={row.startText}
									onChange={(e) =>
										updateEvent(i, 'startText', e.target.value)
									}
								/>
							</label>
							<label className="event-field">
								End
								<input
									type="text"
									className="config-input timestamp-input"
									placeholder="00:00:00:00"
									value={row.endText}
									onChange={(e) =>
										updateEvent(i, 'endText', e.target.value)
									}
								/>
							</label>
							<button
								className="event-remove-btn"
								onClick={() => removeEvent(i)}
								title="Remove event"
							>
								<Minus size={16} />
							</button>
						</div>
					))}

					<button className="event-add-btn" onClick={addEvent}>
						<Plus size={16} />
						<span>Add Event</span>
					</button>
				</div>

				<div className="config-section">
					<h3 className="config-section-title">Detection Thresholds</h3>

					<div className="threshold-grid">
						<label className="threshold-field">
							Velocity threshold (deg/s)
							<input
								type="number"
								className="config-input"
								value={velocityThreshold}
								onChange={(e) =>
									setVelocityThreshold(Number(e.target.value))
								}
							/>
						</label>

						<label className="threshold-field">
							Min saccade duration (ms)
							<input
								type="number"
								className="config-input"
								value={minDuration}
								onChange={(e) =>
									setMinDuration(Number(e.target.value))
								}
							/>
						</label>

						<label className="threshold-field">
							Refractory period (ms)
							<input
								type="number"
								className="config-input"
								value={minInterSaccade}
								onChange={(e) =>
									setMinInterSaccade(Number(e.target.value))
								}
							/>
						</label>

						<label className="threshold-field">
							Amplitude min (deg)
							<input
								type="number"
								className="config-input"
								placeholder="No limit"
								value={amplitudeMin}
								onChange={(e) => setAmplitudeMin(e.target.value)}
							/>
						</label>

						<label className="threshold-field">
							Amplitude max (deg)
							<input
								type="number"
								className="config-input"
								placeholder="No limit"
								value={amplitudeMax}
								onChange={(e) => setAmplitudeMax(e.target.value)}
							/>
						</label>
					</div>
				</div>

				<div className="config-actions">
					<Button onClick={save} disabled={saving}>
						{saving ? 'Saving...' : 'Save Configuration'}
					</Button>
				</div>
			</div>

			<style>
				{`
					.case-config {
						display: flex;
						flex-direction: column;
						gap: 24px;
						padding: 16px;
						max-width: 600px;
					}

					.config-section {
						display: flex;
						flex-direction: column;
						gap: 8px;
					}

					.config-section-title {
						margin: 0;
						font-size: 1.1rem;
						color: #13284c;
					}

					.config-hint {
						margin: 0;
						font-size: 0.85rem;
						color: #666;
					}

					.profile-row {
						display: flex;
						align-items: center;
						gap: 8px;
						flex-wrap: wrap;
					}

					.profile-select {
						flex: 1 1 200px;
						min-width: 180px;
					}

					.profile-btn {
						padding: 6px 12px;
						border: 1px solid #ccc;
						border-radius: var(--action-radius);
						background: #fff;
						cursor: pointer;
						color: #333;
						font-size: 0.85rem;
						transition: all 0.2s ease;
					}

					.profile-btn:hover:not(:disabled) {
						border-color: #13284c;
						color: #13284c;
					}

					.profile-btn:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}

					.profile-btn-danger:hover:not(:disabled) {
						border-color: #c00;
						color: #c00;
						background: #fff0f0;
					}

					.name-prompt-overlay {
						position: fixed;
						inset: 0;
						background: rgba(0, 0, 0, 0.35);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 1000;
					}

					.name-prompt-dialog {
						background: #fff;
						border-radius: var(--action-radius);
						padding: 20px;
						min-width: 320px;
						box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
						display: flex;
						flex-direction: column;
						gap: 16px;
					}

					.name-prompt-label {
						display: flex;
						flex-direction: column;
						gap: 6px;
						font-size: 0.9rem;
						color: #333;
					}

					.name-prompt-actions {
						display: flex;
						justify-content: flex-end;
						gap: 8px;
					}

					.event-row {
						display: flex;
						align-items: flex-end;
						gap: 10px;
						padding: 8px 0;
					}

					.event-label {
						font-weight: 600;
						font-size: 0.9rem;
						min-width: 60px;
						padding-bottom: 6px;
						color: #333;
					}

					.event-field {
						display: flex;
						flex-direction: column;
						font-size: 0.8rem;
						color: #555;
						gap: 2px;
					}

					.config-input {
						padding: 6px 8px;
						border: 1px solid #ccc;
						border-radius: var(--action-radius);
						font-size: 0.9rem;
						font-family: inherit;
						color: #333;
						background: #fff;
					}

					.config-input:focus {
						outline: none;
						border-color: #13284c;
					}

					.timestamp-input {
						width: 120px;
						font-family: monospace;
					}

					.event-remove-btn {
						display: flex;
						align-items: center;
						justify-content: center;
						width: 28px;
						height: 28px;
						border: 1px solid #ccc;
						border-radius: var(--action-radius);
						background: #fff;
						cursor: pointer;
						color: #999;
						margin-bottom: 2px;
						transition: all 0.2s ease;
					}

					.event-remove-btn:hover {
						border-color: #c00;
						color: #c00;
						background: #fff0f0;
					}

					.event-add-btn {
						display: flex;
						align-items: center;
						gap: 6px;
						padding: 6px 12px;
						border: 1px dashed #ccc;
						border-radius: var(--action-radius);
						background: transparent;
						cursor: pointer;
						color: #555;
						font-size: 0.85rem;
						width: fit-content;
						transition: all 0.2s ease;
					}

					.event-add-btn:hover {
						border-color: #13284c;
						color: #13284c;
					}

					.threshold-grid {
						display: grid;
						grid-template-columns: 1fr 1fr;
						gap: 12px;
					}

					.threshold-field {
						display: flex;
						flex-direction: column;
						font-size: 0.8rem;
						color: #555;
						gap: 2px;
					}

					.threshold-field .config-input {
						width: 100%;
					}

					.config-actions {
						display: flex;
						gap: 12px;
					}

					.config-actions .btn {
						margin-top: 0;
					}
				`}
			</style>
		</>
	);
}
