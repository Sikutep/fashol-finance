import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export default function SearchableWorkerSelect({
  workers = [],
  selectedWorkerId,
  onSelectWorker,
  placeholder = 'Cari nama pekerja atau proses...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedWorker = workers.find(w => w.id == selectedWorkerId) || null;

  // Sync input text with selected worker when not open
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedWorker ? selectedWorker.name : '');
    }
  }, [selectedWorker, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery(selectedWorker ? selectedWorker.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedWorker]);

  // Filtered workers based on search query
  const filteredWorkers = workers.filter(w => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = w.name?.toLowerCase().includes(q);
    const procMatch = w.process?.toLowerCase().includes(q);
    const codeMatch = w.worker_code?.toLowerCase().includes(q);
    return nameMatch || procMatch || codeMatch;
  });

  // Reset highlighted index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.worker-suggestion-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (worker) => {
    onSelectWorker(worker.id);
    setSearchQuery(worker.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredWorkers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredWorkers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredWorkers[highlightedIndex]) {
        handleSelect(filteredWorkers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery(selectedWorker ? selectedWorker.name : '');
    }
  };

  const getProcessBadgeStyle = (process) => {
    switch ((process || '').toLowerCase()) {
      case 'jahit':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'potong':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'overdek':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'kansay':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'qc':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox Input Box */}
      <div
        className={`relative flex items-center w-full rounded-lg border bg-white transition-all shadow-xs ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'cursor-text'}`}
        onClick={() => {
          if (!disabled && !isOpen) {
            setIsOpen(true);
            inputRef.current?.select();
          }
        }}
      >
        <div className="pl-3 text-slate-400 shrink-0">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              inputRef.current?.select();
            }
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full py-2 pl-2.5 pr-20 text-sm font-semibold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
        />

        {/* Right Indicators: Process Pill & Dropdown Toggle */}
        <div className="absolute right-2 flex items-center gap-1.5 shrink-0">
          {selectedWorker && !isOpen && (
            <span
              className={`hidden sm:inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${getProcessBadgeStyle(
                selectedWorker.process
              )}`}
            >
              {selectedWorker.process}
            </span>
          )}

          {selectedWorker && isOpen && searchQuery && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              title="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen) {
                setIsOpen(false);
                setSearchQuery(selectedWorker ? selectedWorker.name : '');
              } else {
                setIsOpen(true);
                inputRef.current?.focus();
                inputRef.current?.select();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Suggestion Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Note */}
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>
              {filteredWorkers.length === workers.length
                ? `Semua Pekerja Produksi (${workers.length})`
                : `${filteredWorkers.length} pekerja ditemukan`}
            </span>
            <span className="text-[10px] text-slate-400">
              Gunakan ↑ ↓ lalu Enter
            </span>
          </div>

          {/* List of Suggestions */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100/60 p-1"
          >
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker, index) => {
                const isSelected = worker.id == selectedWorkerId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={worker.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(worker)}
                    className={`worker-suggestion-item flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50/80 text-emerald-950'
                        : isSelected
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {worker.name ? worker.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>

                      <div className="truncate text-left">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {worker.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{worker.worker_code || `ID #${worker.id}`}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-600">
                            Bagian {worker.process || 'Umum'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getProcessBadgeStyle(
                          worker.process
                        )}`}
                      >
                        {worker.process || 'Borongan'}
                      </span>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  Tidak ada pekerja yang cocok dengan "{searchQuery}"
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Coba ketik bagian kerja seperti <strong>Jahit</strong>, <strong>Potong</strong>, atau nama depan pekerja.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tampilkan Semua ({workers.length} Pekerja)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
