/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, BookOpen, Highlighter } from 'lucide-react';
import type { ReadingResource } from '../types';

interface ResourceSelectComboboxProps {
  resources: ReadingResource[];
  selectedId: string;
  onSelect: (id: string) => void;
  activeId?: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const ResourceSelectCombobox: React.FC<ResourceSelectComboboxProps> = ({
  resources,
  selectedId,
  onSelect,
  activeId,
  placeholder = 'Select reading resource...',
  label,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const selectedResource = useMemo(
    () => resources.find(r => r.id === selectedId),
    [resources, selectedId]
  );

  const filteredResources = useMemo(() => {
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.level.toLowerCase().includes(q) ||
        r.canonicalText.toLowerCase().includes(q)
    );
  }, [resources, search]);

  return (
    <div ref={containerRef} className={`relative w-full text-left font-mono ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold uppercase text-neutral-600 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button / Selected Card */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-left border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_#000] transition-all hover:bg-[#FFFDF0] focus:outline-hidden focus:ring-2 focus:ring-black ${
          isOpen ? 'ring-2 ring-black bg-[#FFFDF0]' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {selectedResource ? (
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <h4
                  className="font-reading font-bold text-sm text-black truncate flex-1"
                  title={selectedResource.title}
                >
                  {selectedResource.title}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedResource.id === activeId && (
                    <span className="neo-badge bg-[#FF3838] text-white text-[8px] py-0 px-1 font-bold">
                      LIVE
                    </span>
                  )}
                  <span className="bg-[#FFE500] text-black text-[9px] px-1 py-0.2 border border-black font-bold">
                    {selectedResource.level.split(' ')[0]}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-600">
                <span className="bg-neutral-100 px-1 py-0.2 border border-black/30 font-semibold truncate max-w-[140px]">
                  {selectedResource.category}
                </span>
                <span>•</span>
                <span>{selectedResource.sentences?.length || 0} sentences</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-neutral-800 font-bold">
                  <Highlighter size={10} className="text-[#FF3838]" />
                  {selectedResource.annotations?.filter(a => a.status === 'approved').length || 0} Chunks
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-neutral-500 py-1 text-xs">
              <BookOpen size={14} />
              <span>{placeholder}</span>
            </div>
          )}

          <ChevronDown
            size={16}
            className={`text-black transition-transform duration-150 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border-2 border-black shadow-[4px_4px_0px_#000] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Internal Quick Search Bar */}
          {resources.length > 4 && (
            <div className="p-2 border-b border-black/20 bg-[#FFFDF0]">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to filter reading resources..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-xs font-mono py-1 pl-7 pr-2 border border-black bg-white outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          )}

          {/* List of Resources */}
          <div className="max-h-64 overflow-y-auto divide-y divide-black/10">
            {filteredResources.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 italic">
                No reading resources found matching "{search}".
              </div>
            ) : (
              filteredResources.map(res => {
                const isSelected = res.id === selectedId;
                const isCurrentLive = res.id === activeId;
                const approvedChunks =
                  res.annotations?.filter(a => a.status === 'approved').length || 0;

                return (
                  <div
                    key={res.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(res.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 cursor-pointer transition-colors flex items-start justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-[#FFE500]/40 font-bold'
                        : isCurrentLive
                        ? 'bg-red-50/50 hover:bg-[#FFF8D6]'
                        : 'hover:bg-[#FFF8D6]'
                    }`}
                  >
                    {/* Left: Article details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-reading text-sm ${
                            isSelected ? 'font-black text-black' : 'font-bold text-neutral-900'
                          } truncate`}
                        >
                          {res.title}
                        </span>
                        {isCurrentLive && (
                          <span className="neo-badge bg-[#FF3838] text-white text-[8px] py-0 px-1 font-bold">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-600 font-mono">
                        <span className="bg-neutral-100 px-1 py-0.2 border border-black/30 font-semibold">
                          {res.category}
                        </span>
                        <span className="bg-white px-1 py-0.2 border border-black/30 text-neutral-700 font-bold">
                          {res.level.split(' ')[0]}
                        </span>
                        <span>•</span>
                        <span>{res.sentences?.length || 0} sentences</span>
                        <span>•</span>
                        <span className="text-neutral-800 font-bold flex items-center gap-0.5">
                          <Highlighter size={9} className="text-[#FF3838]" />
                          {approvedChunks} Chunks
                        </span>
                      </div>

                      {/* 1-line preview of first sentence */}
                      <p className="text-[10px] text-neutral-500 line-clamp-1 italic font-reading">
                        "{res.sentences?.[0] || res.canonicalText.slice(0, 80)}..."
                      </p>
                    </div>

                    {/* Right: Selected checkmark */}
                    <div className="shrink-0 pt-0.5">
                      {isSelected ? (
                        <div className="w-5 h-5 bg-black text-white flex items-center justify-center border border-black">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border border-black/30 bg-white hover:border-black" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
