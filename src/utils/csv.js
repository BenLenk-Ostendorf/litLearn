import Papa from 'papaparse'

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results)
      },
      error: (err) => {
        reject(err)
      }
    })
  })
}

export function validateDOI(doi) {
  if (!doi || typeof doi !== 'string') return false
  return doi.trim().startsWith('10.')
}

export function validateDate(dateStr) {
  if (!dateStr) return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}
