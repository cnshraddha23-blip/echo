import React, { useState, useEffect } from 'react';
import { Folder, FileText, Search, RefreshCw, Eye, Sparkles, XCircle, Code, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '../types';
import { api } from '../services/api';

export const FileManagerPanel: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewedFile, setViewedFile] = useState<{ path: string; content: string } | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summarizing, setSummarizing] = useState(false);

  const loadDirectory = async (dir = '') => {
    setLoading(true);
    try {
      const res = await api.listFiles(dir);
      if (res.success) {
        setFiles(res.items);
        setCurrentPath(res.current_path);
      }
    } catch (e) {
      console.error("List files error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadDirectory();
      return;
    }
    setLoading(true);
    try {
      const matches = await api.searchFiles(searchQuery.trim());
      setFiles(matches);
    } catch (e) {
      console.error("Search files error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReadFile = async (path: string) => {
    try {
      const res = await api.readFile(path);
      setViewedFile({ path, content: res.content });
    } catch (e) {
      console.error("Read file error:", e);
    }
  };

  const handleSummarize = async (path: string) => {
    setSummarizing(true);
    setSummaryData(null);
    try {
      const res = await api.summarizeFile(path);
      setSummaryData(res);
    } catch (e) {
      console.error("Summarize error:", e);
    } finally {
      setSummarizing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col p-8 bg-[#F8F1E7] overflow-y-auto max-w-6xl space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-5">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-[#29241F]">
            File Management Agent
          </h1>
          <p className="text-xs text-[#81766B] mt-0.5">
            Inspect authorized workspace documents, source code, and generate AI executive summaries.
          </p>
        </div>

        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-2.5 rounded-xl border border-[#E8DCCD] bg-[#FFFDF9] hover:bg-[#EFE3D3] text-[#81766B] hover:text-[#29241F] transition-colors cursor-pointer"
          title="Refresh Directory"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Search and Navigation Bar */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#81766B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by filename or extension (e.g. '.py', 'config', 'report')..."
            className="w-full bg-[#FFFDF9] border border-[#E8DCCD] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#29241F] focus:outline-none focus:border-[#D97745]"
          />
        </form>

        {currentPath && (
          <button
            onClick={() => loadDirectory('')}
            className="px-3.5 py-2.5 bg-[#EFE3D3] hover:bg-[#D97745] hover:text-white text-xs font-medium rounded-xl transition-colors cursor-pointer text-[#29241F]"
          >
            Root
          </button>
        )}
      </div>

      {/* Files List Table */}
      <div className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 px-5 bg-[#EFE3D3] border-b border-[#E8DCCD] flex items-center justify-between text-[11px] font-bold text-[#81766B] uppercase tracking-wider">
          <span className="w-1/2">File / Folder Name</span>
          <span className="w-1/4">Size</span>
          <span className="w-1/4 text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#81766B]">Reading workspace...</div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#81766B]">No files match query.</div>
        ) : (
          <div className="divide-y divide-[#E8DCCD]">
            {files.map((file) => (
              <div
                key={file.path}
                className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-[#F8F1E7] transition-colors"
              >
                <div 
                  onClick={() => file.is_dir ? loadDirectory(file.path) : handleReadFile(file.path)}
                  className="w-1/2 flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  {file.is_dir ? (
                    <Folder size={17} className="text-[#D97745] shrink-0" />
                  ) : file.ext === '.py' || file.ext === '.ts' || file.ext === '.tsx' ? (
                    <Code size={17} className="text-[#2563EB] shrink-0" />
                  ) : (
                    <FileText size={17} className="text-[#81766B] shrink-0" />
                  )}
                  <span className={`font-medium truncate ${file.is_dir ? 'text-[#D97745]' : 'text-[#29241F]'}`}>
                    {file.name}
                  </span>
                </div>

                <span className="w-1/4 text-[11px] font-mono text-[#81766B]">
                  {file.is_dir ? "Directory" : formatBytes(file.size_bytes)}
                </span>

                <div className="w-1/4 flex items-center justify-end gap-2">
                  {!file.is_dir && (
                    <>
                      <button
                        onClick={() => handleReadFile(file.path)}
                        className="p-1.5 hover:text-[#D97745] rounded-md transition-colors cursor-pointer text-[#81766B]"
                        title="View File Content"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleSummarize(file.path)}
                        className="p-1.5 hover:text-[#D97745] rounded-md transition-colors cursor-pointer text-[#81766B]"
                        title="Summarize Document"
                      >
                        <Sparkles size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Content / Summary Drawer Modal */}
      <AnimatePresence>
        {(viewedFile || summaryData || summarizing) && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FFFDF9] border border-[#E8DCCD] rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E8DCCD] pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[#D97745]" />
                  <h3 className="font-serif-display text-base font-bold text-[#29241F] truncate">
                    {viewedFile?.path || summaryData?.path || "Document Inspector"}
                  </h3>
                </div>
                <button
                  onClick={() => { setViewedFile(null); setSummaryData(null); }}
                  className="p-1 text-[#81766B] hover:text-[#29241F] cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {summarizing ? (
                <div className="p-8 text-center text-xs text-[#81766B]">Summarizing document...</div>
              ) : summaryData ? (
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="p-4 bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl text-xs space-y-2">
                    <span className="font-bold text-[#D97745] uppercase tracking-wider text-[10px]">AI Executive Summary</span>
                    <p className="text-[#29241F] leading-relaxed">{summaryData.summary}</p>
                  </div>
                  {summaryData.headings?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#81766B]">Key Structure & Declarations:</span>
                      <div className="space-y-1">
                        {summaryData.headings.map((h: string, i: number) => (
                          <div key={i} className="text-[11px] font-mono bg-[#EFE3D3] p-1.5 px-2.5 rounded text-[#29241F] truncate">
                            {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : viewedFile ? (
                <pre className="flex-1 overflow-auto bg-[#F8F1E7] border border-[#E8DCCD] rounded-xl p-4 text-[11px] font-mono text-[#29241F] leading-relaxed select-text">
                  {viewedFile.content}
                </pre>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
