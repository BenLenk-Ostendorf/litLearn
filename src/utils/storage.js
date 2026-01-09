async function getOrCreateDirectory(parentHandle, dirName) {
  try {
    return await parentHandle.getDirectoryHandle(dirName, { create: true })
  } catch (err) {
    console.error(`Error creating directory ${dirName}:`, err)
    throw err
  }
}

async function readJsonFile(dirHandle, fileName, defaultValue = null) {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return defaultValue
    }
    throw err
  }
}

async function writeJsonFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

export async function loadPapers(rootHandle) {
  const dataDir = await getOrCreateDirectory(rootHandle, 'data')
  const data = await readJsonFile(dataDir, 'papers.json', { papers: [] })
  return data.papers || []
}

export async function savePapers(rootHandle, papers) {
  const dataDir = await getOrCreateDirectory(rootHandle, 'data')
  await writeJsonFile(dataDir, 'papers.json', { papers })
}

export async function loadSettings(rootHandle) {
  const dataDir = await getOrCreateDirectory(rootHandle, 'data')
  return await readJsonFile(dataDir, 'settings.json', {})
}

export async function saveSettings(rootHandle, settings) {
  const dataDir = await getOrCreateDirectory(rootHandle, 'data')
  await writeJsonFile(dataDir, 'settings.json', settings)
}

export async function savePdf(rootHandle, fileName, fileData) {
  const pdfsDir = await getOrCreateDirectory(rootHandle, 'pdfs')
  const fileHandle = await pdfsDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(fileData)
  await writable.close()
  return `pdfs/${fileName}`
}

export async function loadPdf(rootHandle, relativePath) {
  const parts = relativePath.split('/')
  let currentHandle = rootHandle
  
  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(parts[i])
  }
  
  const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1])
  return await fileHandle.getFile()
}

export async function saveDraft(rootHandle, paperId, draftData) {
  const dataDir = await getOrCreateDirectory(rootHandle, 'data')
  const draftsDir = await getOrCreateDirectory(dataDir, 'drafts')
  await writeJsonFile(draftsDir, `${paperId}.json`, draftData)
}

export async function loadDraft(rootHandle, paperId) {
  try {
    const dataDir = await getOrCreateDirectory(rootHandle, 'data')
    const draftsDir = await getOrCreateDirectory(dataDir, 'drafts')
    return await readJsonFile(draftsDir, `${paperId}.json`, null)
  } catch {
    return null
  }
}

export async function deleteDraft(rootHandle, paperId) {
  try {
    const dataDir = await getOrCreateDirectory(rootHandle, 'data')
    const draftsDir = await getOrCreateDirectory(dataDir, 'drafts')
    await draftsDir.removeEntry(`${paperId}.json`)
  } catch {
    // Ignore if draft doesn't exist
  }
}
