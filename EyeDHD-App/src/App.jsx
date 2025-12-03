import { useState } from 'react'
import './App.css'
import HomePage from './components/HomePage.jsx'
import CsvFileImport from './components/CsvFileImport.jsx'
import AnimationGenerator from './components/AnimationGenerator.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import Navbar from './components/Navbar.jsx'
import SidebySide from './components/SidebySide'

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
    <SidebySide />
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
