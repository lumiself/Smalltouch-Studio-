import { useState } from 'react'
import { useLibrary } from '../../contexts/LibraryContext'
import LibraryPanel from './LibraryPanel'
import ResultsPanel from './ResultsPanel'

export default function PanelShell({
  // Column sizing — override only when a panel needs non-default proportions
  toolsClassName = 'flex-1 overflow-hidden min-h-0',
  resultsClassName,
  // Optional right-column override (for panels with non-job output)
  resultsSlot,
  resultsLabel = 'Results',
  // Controlled mobile tab (panels that need programmatic navigation pass these)
  mobileTab: externalTab,
  onMobileTabChange,
  // Retry handler for failed jobs
  onRetry,
  // Continue handler — sends a completed result to another feature as a chained input
  onContinue,
  // Center tools content
  children,
}) {
  const {
    images, selectedImage, setSelectedImage,
    addImages, batchQueue, addToBatch, jobs,
  } = useLibrary()

  const [internalTab, setInternalTab] = useState('tools')
  const mobileTab = externalTab ?? internalTab
  const setMobileTab = onMobileTabChange ?? setInternalTab

  const resolvedResultsClassName =
    resultsClassName ?? 'w-full md:w-[260px] shrink-0 border-l border-[#2b271f]'

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Mobile top tabs */}
      <div className="md:hidden flex border-b border-[#2b271f] shrink-0 bg-[#121110]">
        {[
          { id: 'library', label: 'Library' },
          { id: 'tools',   label: 'Tools'   },
          { id: 'results', label: resultsLabel },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              mobileTab === tab.id
                ? 'text-[#c5a572] border-[#c5a572]'
                : 'text-[#6b665c] border-transparent hover:text-[#9a9387]'
            }`}
          >
            {tab.label}
            {tab.id === 'results' && !resultsSlot && jobs.length > 0 && (
              <span className="ml-1 text-[9px] bg-[#c5a572]/20 text-[#c5a572] px-1 rounded-full">
                {jobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Library ── */}
        <div className={`${mobileTab === 'library' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[220px] shrink-0 border-r border-[#2b271f] overflow-hidden`}>
          <LibraryPanel
            images={images}
            selectedImage={selectedImage}
            onSelect={img => { setSelectedImage(img); setMobileTab('tools') }}
            onUpload={addImages}
            batchQueue={batchQueue}
            onAddToBatch={addToBatch}
          />
        </div>

        {/* ── Tools (center) ── */}
        <div className={`${mobileTab === 'tools' ? 'flex' : 'hidden'} md:flex flex-col ${toolsClassName}`}>
          {children}
        </div>

        {/* ── Results / Output ── */}
        <div className={`${mobileTab === 'results' ? 'flex' : 'hidden'} md:flex flex-col ${resolvedResultsClassName} overflow-hidden`}>
          {resultsSlot ?? <ResultsPanel jobs={jobs} onRetry={onRetry} onContinue={onContinue} />}
        </div>

      </div>
    </div>
  )
}
