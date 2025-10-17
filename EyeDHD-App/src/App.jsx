import { useState } from 'react'
import CsvFileImport from './components/CsvFileImport.jsx'
import './App.css'

function App() {
  const [csvData, setCsvData] = useState("");

  const handleFileLoad = (data) => {
    console.log("CSV Data Loaded:", data);
    setCsvData(data);
  };
  
  return (
    <>
      <CsvFileImport onFileLoad={handleFileLoad} />
      <textarea className="csv-textarea">{csvData.slice(0, 500)}</textarea>
    </>
  )
}

export default App
