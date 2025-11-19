import { useState } from 'react'
import './App.css'
import HomePage from './components/HomePage.jsx'
import CsvFileImport from './components/CsvFileImport.jsx'
import AnimationGenerator from './components/AnimationGenerator.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import Navbar from './components/Navbar.jsx'

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const content = [
    <HomePage setCurrent={setCurrent}/>,
    //<CsvFileImport isLoading={isLoading} setIsLoading={setIsLoading} />,
    <CsvFileImport />,
    <AnimationGenerator />,
    <p>Side-by-side Viewer Content</p>
  ]
  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      <Navbar current={current} setCurrent={setCurrent} />
      {content[current]}
    </>
  )
}

export default App
