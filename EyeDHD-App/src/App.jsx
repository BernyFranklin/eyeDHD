import { useState } from 'react'
import CsvFileImport from './components/CsvFileImportBackend.jsx'
import './App.css'
import Navbar from './components/Navbar.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import HomePage from './components/HomePage.jsx'

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const content = [
    <HomePage setCurrent={setCurrent}/>,
    //<CsvFileImport isLoading={isLoading} setIsLoading={setIsLoading} />,
    <CsvFileImport />,
    <p>Generate Eye Animation Content</p>,
    <p>Side-by-side Viewer Content</p>
  ]
  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      <Navbar setCurrent={setCurrent} />
      {content[current]}
    </>
  )
}

export default App
