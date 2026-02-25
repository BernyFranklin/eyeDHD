import React, { useEffect, useMemo, useState } from 'react';

import './App.css';
import HomePage from './components/HomePage';
import CsvFileImport from './components/CsvFileImport';
import AnimationGenerator from './components/AnimationGenerator';
import { Visualization } from './components/visualization';
import LoadingOverlay from './components/LoadingOverlay';
import Navbar from './components/Navbar';
import SidebySide from './components/SidebySide';
import CaseList from './components/CaseList';

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
    <AnimationGenerator
      buttonsDisabled={buttonsDisabled}
      setButtonsDisabled={setButtonsDisabled}
    />,
    <SidebySide />,
    <Visualization />
  ];

  // return (
  //   <>
  //     <LoadingOverlay isLoading={isLoading} />
  //     <Navbar
  //       current={current}
  //       setCurrent={setCurrent}
  //       buttonsDisabled={buttonsDisabled}
  //     />
  //     {content[current]}
  //   </>
  // );
  //
  return (
  	<CaseList />
  );
}

export default App;
