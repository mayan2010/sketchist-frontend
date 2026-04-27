import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import axios from 'axios'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'+'/api/convert'
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [apiTime, setApiTime] = useState(null)
  const [liveTime, setLiveTime] = useState(0)
  const fileInputRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    let intervalId = null
    if (loading) {
      startTimeRef.current = performance.now()
      setLiveTime(0)
      intervalId = setInterval(() => {
        setLiveTime(((performance.now() - startTimeRef.current) / 1000).toFixed(1))
      }, 100)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [loading])

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }
    setError(null)
    setResultUrl(null)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    handleFile(file)
  }, [handleFile])

  const handleConvert = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)
    setResultUrl(null)
    setApiTime(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await axios.post(API_URL, formData, {
        responseType: 'blob',
      })

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Server error: ${response.status} ${response.statusText || ''}`)
      }

      const elapsed = ((performance.now() - startTimeRef.current) / 1000).toFixed(1)
      setApiTime(elapsed)

      const blob = response.data
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setResultUrl(null)
    setError(null)
    setApiTime(null)
    setLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `converted-${selectedFile?.name || 'image'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Sketchy</h1>
        <p className="app-subtitle">Upload an image and get a processed version back</p>

      </header>

      {/* Main Card */}
      <div className="card">
        <div className="card-body">
          {/* Loading State */}
          {loading && (
            <div className="loading-overlay" id="loading-indicator">
              <div className="spinner"></div>
              <p className="loading-text">Processing your image…</p>
              <div className="live-timer" id="live-timer">
                <span className="api-time-icon">⏱</span>
                <span>{liveTime}s</span>
              </div>
            </div>
          )}

          {/* Drop Zone (shown when no file selected and not loading) */}
          {!selectedFile && !loading && (
            <div
              id="drop-zone"
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="drop-zone-text">
                <strong>Click to upload</strong> or drag and drop<br />
                PNG, JPG, WEBP, or GIF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                id="file-input"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Preview (shown when file selected and not loading) */}
          {selectedFile && !loading && (
            <div className="preview-section">
              <div className="preview-container">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="preview-image"
                  id="preview-image"
                />
                <div className="preview-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-message" id="error-message">
              {error}
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div className="result-section" style={{ marginTop: '24px' }}>
              <div className="result-header">
                <div className="result-label">✓ Processed Image</div>
                {apiTime && (
                  <div className="api-time" id="api-time">
                    <span className="api-time-icon">⏱</span>
                    <span>{apiTime}s</span>
                  </div>
                )}
              </div>
              <div className="result-container">
                <img
                  src={resultUrl}
                  alt="Processed result"
                  className="result-image"
                  id="result-image"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {selectedFile && !loading && (
          <div className="actions">
            <button
              className="btn btn-secondary"
              id="reset-btn"
              onClick={handleReset}
            >
              ↺ Reset
            </button>
            {!resultUrl ? (
              <button
                className="btn btn-primary"
                id="convert-btn"
                onClick={handleConvert}
              >
                → Convert
              </button>
            ) : (
              <>
                <button
                  className="btn btn-accent"
                  id="repeat-btn"
                  onClick={() => {
                    if (resultUrl) URL.revokeObjectURL(resultUrl)
                    setResultUrl(null)
                    handleConvert()
                  }}
                >
                  ⟳ Repeat
                </button>
                <button
                  className="btn btn-primary"
                  id="download-btn"
                  onClick={handleDownload}
                >
                  ↓ Download
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
