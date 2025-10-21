import { useState } from 'react'
import CsvFileImport from './components/CsvFileImport.jsx'
import './App.css'
import Navbar from './components/Navbar.jsx'

function App() {
  const [csvData, setCsvData] = useState("");

  const handleFileLoad = (data) => {
    console.log("CSV Data Loaded:", data.slice(0, 500));
    setCsvData(data);
  };
  
  return (
    <>
      <Navbar />
      <CsvFileImport onFileLoad={handleFileLoad} />
      <textarea className="csv-textarea" value={csvData.slice(0, 500)} readOnly></textarea>
    </>
  )
}

export default App
