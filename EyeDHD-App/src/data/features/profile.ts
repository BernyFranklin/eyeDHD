import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '..';
import type { ConfigProfile, ConfigProfileCreate, ConfigProfileUpdate } from '../types';

type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProfileState = {
	profiles: ConfigProfile[];
	status: ProfileStatus;
	error: string | null;
};

const initialState: ProfileState = {
	profiles: [],
	status: 'idle',
	error: null
};

/**
 * Loads the list of config profiles from the currently-open project.
 * Safe to call repeatedly; will overwrite the in-memory list each time.
 */
export const loadProfiles = createAsyncThunk<ConfigProfile[]>(
	'profile/load',
	async () => {
		return await window.electron.profile.list();
	}
);

/**
 * Creates a new config profile from the given input and appends it to the list.
 */
export const createProfile = createAsyncThunk<ConfigProfile, ConfigProfileCreate>(
	'profile/create',
	async (input) => {
		return await window.electron.profile.create(input);
	}
);

/**
 * Updates an existing config profile and replaces it in the list.
 */
export const updateProfile = createAsyncThunk<
	ConfigProfile,
	{ profile: ConfigProfile; updates: ConfigProfileUpdate }
>(
	'profile/update',
	async ({ profile, updates }) => {
		return await window.electron.profile.update(profile, updates);
	}
);

/**
 * Deletes a config profile and removes it from the list.
 */
export const deleteProfile = createAsyncThunk<ConfigProfile, ConfigProfile>(
	'profile/delete',
	async (profile) => {
		return await window.electron.profile.delete(profile);
	}
);

/**
 * Redux slice for config profiles (saved marker + detection bundles). The list
 * is populated lazily via loadProfiles() and kept in sync through the create/
 * update/delete thunks.
 */
export const profileSlice = createSlice({
	name: 'profile',
	initialState,
	reducers: {
		resetProfiles: (state) => {
			state.profiles = [];
			state.status = 'idle';
			state.error = null;
		}
	},
	extraReducers: (builder) => {
		builder
			.addCase(loadProfiles.pending, (state) => {
				state.status = 'loading';
				state.error = null;
			})
			.addCase(loadProfiles.fulfilled, (state, action: PayloadAction<ConfigProfile[]>) => {
				state.status = 'ready';
				state.profiles = action.payload;
			})
			.addCase(loadProfiles.rejected, (state, action) => {
				state.status = 'error';
				state.error = action.error.message ?? 'Failed to load profiles';
			})
			.addCase(createProfile.fulfilled, (state, action: PayloadAction<ConfigProfile>) => {
				state.profiles = [...state.profiles, action.payload].sort((a, b) =>
					a.name.localeCompare(b.name)
				);
			})
			.addCase(updateProfile.fulfilled, (state, action: PayloadAction<ConfigProfile>) => {
				state.profiles = state.profiles
					.map((p) => (p.id === action.payload.id ? action.payload : p))
					.sort((a, b) => a.name.localeCompare(b.name));
			})
			.addCase(deleteProfile.fulfilled, (state, action: PayloadAction<ConfigProfile>) => {
				state.profiles = state.profiles.filter((p) => p.id !== action.payload.id);
			});
	}
});

export const { resetProfiles } = profileSlice.actions;

export const selectProfiles = (state: RootState) => state.profile.profiles;
export const selectProfileStatus = (state: RootState) => state.profile.status;
export const selectProfileError = (state: RootState) => state.profile.error;
export const selectProfileById = (id: number) => (state: RootState) =>
	state.profile.profiles.find((p) => p.id === id) ?? null;

export default profileSlice.reducer;
