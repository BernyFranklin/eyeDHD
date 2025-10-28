import { useState } from 'react'
import CsvFileImport from './components/CsvFileImportBackend'
import './App.css'
import Navbar from './components/Navbar'
import Animation from './components/AnimationWindow'

function App() {
  const [current, setCurrent] = useState(0);
  const content = [
    <p>Home Content</p>,
    <CsvFileImport />,
    <p>Generate Eye Animation Content</p>,
    <p>Side-by-side Viewer Content</p>
  ]
  return (
    <>
      <Navbar setCurrent={setCurrent} />
      {content[current]}
      <Animation />
    </>
  )
}

export default App
