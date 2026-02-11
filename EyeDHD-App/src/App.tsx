import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import HomePage from './components/HomePage';
import CsvFileImport from './components/CsvFileImport';
import AnimationGenerator from './components/AnimationGenerator';
import { Visualization } from './components/visualization';
import LoadingOverlay from './components/LoadingOverlay';
import Navbar from './components/Navbar';
import SidebySide from './components/SidebySide';
import RemoteStream from './data/RemoteStream';
import { CSVData } from '../electron/db/tables/csv';

function TestData() {
	const [csvStream, setCsvStream] = useState<RemoteStream | null>(null);
	const [csvData, setCsvData] = useState<CSVData[]>(null);
	const filename = "part_aa.csv";

	const startStream = async () => {
		const file = await window.electron.csv.getMetadata(filename);
    setCsvStream(await RemoteStream.create("CSVData", { file }));
	}

	useEffect(() => {
		if (csvStream === null) return;

		const loadData = async () => {
			const data = [] as CSVData[];
			for await (const row of csvStream) {
				if (data.length > 10) break;

				data.push(row as CSVData);
			}

			setCsvData(data);
		}

		loadData().then(() => {
			csvStream.cancel();
			setCsvStream(null);
		});
	}, [csvStream]);

	const text = useMemo(() => {
		return JSON.stringify(csvData, null, 2);
	}, [csvData]);

	return (
		<>
			I'm testing data

			<label htmlFor="csvFile">part_aa.csv preview:</label>
			<textarea readOnly id="csvFile" value={text}></textarea>
			<button onClick={startStream}>load</button>
		</>
	);
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const content = [
    <HomePage setCurrent={setCurrent} />,
    <CsvFileImport
      buttonsDisabled={buttonsDisabled}
      setButtonsDisabled={setButtonsDisabled}
    />,
    <AnimationGenerator />,
    <SidebySide />,
    <Visualization />
  ];
  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      <Navbar
        current={current}
        setCurrent={setCurrent}
        buttonsDisabled={buttonsDisabled}
      />
      {content[current]}
    </>
  );
}

export default App;
