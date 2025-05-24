import React from 'react'
import './FileInput.css'

// Props voor de FileInput component
interface FileInputProps {
  // Labeltekst boven de bestandkeuze
  label: string
  // Geselecteerd bestand of null als geen bestand gekozen
  file: File | null
  // Foutindicator (bijv. bij ongeldig bestand)
  error?: boolean
  // Ref voor het verborgen file input element
  inputRef: React.Ref<HTMLInputElement>
  // Callback voor knop 'Bestand kiezen'
  onChoose: () => void
  // Handler voor change event van file input
  onChange: React.ChangeEventHandler<HTMLInputElement>
  // Callback om de geselecteerde file te verwijderen
  onClear: () => void
  // Drag-and-drop event handlers
  onDragEnter: React.DragEventHandler<HTMLDivElement>
  onDragLeave: React.DragEventHandler<HTMLDivElement>
  onDragOver: React.DragEventHandler<HTMLDivElement>
  onDrop: React.DragEventHandler<HTMLDivElement>
}

// FileInput component: maakt een file upload UI met drag-and-drop en knop
const FileInput: React.FC<FileInputProps> = ({
  label,
  file,
  error = false,
  inputRef,
  onChoose,
  onChange,
  onClear,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}) => {
  // CSS classes bepalen op basis van selectie en error status
  const classes =
    'sidebar-file-input' +
    (file ? ' file-input--selected' : '') +
    (error ? ' file-input-error' : '')

  return (
    <>
      {/* Labeltekst */}
      <span className="file-label">{label}</span>
      {/* Container voor bestandkeuze, ondersteund drag-and-drop */}
      <div
        className={classes}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Verborgen file input element */}
        <input
          type="file"
          accept=".csv"
          hidden
          ref={inputRef}
          onChange={onChange}
          multiple={false}
        />
        {file ? (
          <>
            {/* Toon bestandsnaam en verwijderknop als bestand gekozen */}
            <span className="file-name">{file.name}</span>
            <button
              type="button"
              className="remove-file-button"
              onClick={onClear}
              aria-label="Verwijder bestand"
            >
              ×
            </button>
          </>
        ) : (
          <>
            {/* Knop om bestand te selecteren en instructie voor drag-and-drop */}
            <button
              type="button"
              className="file-button"
              onClick={onChoose}
            >
              Bestand kiezen
            </button>
            <span className="file-label-inline">of sleep hier</span>
          </>
        )}
      </div>
    </>
  )
}

export default FileInput
