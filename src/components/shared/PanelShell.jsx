import { useState } from 'react'
import LibraryPanel from './LibraryPanel'
import ResultsPanel from './ResultsPanel'

export default function PanelShell({
  // Library
  images = [],
  selectedImage = null,
  onSelect,
  onUpload,
  libraryMode = 'multi',
  batchQueue = [],
  onAddToBatch,
  // Default results (job list)
  jobs = [],
  onDownloadAll,
  // Override right column entirely
  resultsSlot,
  resultsLabel = 'Results',
  // Column layout — override only when a panel needs non-default sizing
  toolsClassName = 'flex-1 overflow-hidden min-h-0',
  resultsClassName,
  // Controlled mobile tab (optional — panels that need programmatic navigation pass these)
  mobileTab: externalTab,
  onMobileTabChange,
  // Center tools content
  children,
}) {
  const [internalTab, setInternalTab] = useState('tools')
  const mobileTab = externalTab ?? internalTab
  const setMobileTab = onMobileTabChange ?? setInternalTab

  const resolvedResultsClassName =
    resultsClassName ?? 'w-full md:w-[260px] shrink-0 border-l border-[#2a2a2a]'

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Mobile top tabs */}
      <div className="md:hidden flex border-b border-[#2a2a2a] shrink-0 bg-[#1a1a1a]">
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
                ? 'text-[#a855f7] border-[#a855f7]'
                : 'text-[#555] border-transparent hover:text-[#a3a3a3]'
            }`}
          >
            {tab.label}
            {tab.id === 'results' && !resultsSlot && jobs.length > 0 && (
              <span className="ml-1 text-[9px] bg-[#a855f7]/20 text-[#a855f7] px-1 rounded-full">
                {jobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Library ── */}
        <div className={`${mobileTab === 'library' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[220px] shrink-0 border-r border-[#2a2a2a] overflow-hidden`}>
          <LibraryPanel
            images={images}
            selectedImage={selectedImage}
            onSelect={img => { onSelect?.(img); setMobileTab('tools') }}
            onUpload={onUpload}
            mode={libraryMode}
            batchQueue={batchQueue}
            onAddToBatch={onAddToBatch}
          />
        </div>

        {/* ── Tools (center) ── */}
        <div className={`${mobileTab === 'tools' ? 'flex' : 'hidden'} md:flex flex-col ${toolsClassName}`}>
          {children}
        </div>

        {/* ── Results / Output ── */}
        <div className={`${mobileTab === 'results' ? 'flex' : 'hidden'} md:flex flex-col ${resolvedResultsClassName} overflow-hidden`}>
          {resultsSlot ?? <ResultsPanel jobs={jobs} onDownloadAll={onDownloadAll} />}
        </div>

      </div>
    </div>
  )
}
