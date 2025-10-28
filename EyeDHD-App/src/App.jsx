import { useState } from 'react'
import CsvFileImport from './components/CsvFileImportBackend'
import './App.css'
import Navbar from './components/Navbar.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const content = [
    <p>Home Content</p>,
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
