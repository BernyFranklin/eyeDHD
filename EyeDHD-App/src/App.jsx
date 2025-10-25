import { useState } from 'react'
import CsvFileImport from './components/CsvFileImportBackend'
import './App.css'
import Navbar from './components/Navbar'

function App() {
  const [current, setCurrent] = useState(0);
  const content = [
    <p>Home Content</p>,
    <CsvFileImport page={current} />,
    <p>Generate Eye Animation Content</p>,
    <p>Side-by-side Viewer Content</p>
  ]
  return (
    <>
      <Navbar setCurrent={setCurrent} />
      {content[current]}
    </>
  )
}

export default App
