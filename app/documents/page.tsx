'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Folder, 
  FolderPlus, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  Edit3, 
  Tag, 
  Building2, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  Plus,
  X,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import SafeCopilot from '@/components/SafeCopilot';
import { TechnicalDocument, User } from '@/lib/types';

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<TechnicalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');

  // Preview & Upload Modals
  const [previewDoc, setPreviewDoc] = useState<TechnicalDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState<TechnicalDocument | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProductName, setUploadProductName] = useState('');
  const [uploadManufacturer, setUploadManufacturer] = useState('Radiant Construction Technologies LLP');
  const [uploadDocType, setUploadDocType] = useState<'TDS' | 'MSDS' | 'CERTIFICATE' | 'CATALOG' | 'APPLICATION_GUIDE'>('TDS');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadFolderPath, setUploadFolderPath] = useState('/');
  const [uploadVersion, setUploadVersion] = useState('1.0');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFilePath, setUploadFilePath] = useState('');
  const [uploadExtractedText, setUploadExtractedText] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'ALL_SALES' | 'MANAGEMENT_ONLY'>('ALL_SALES');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [authRes, docRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/documents')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (docRes.ok) {
        const data = await docRes.json();
        setDocuments(data.documents || []);

        // Auto-open preview if search param matches
        const targetSearch = searchParams.get('search');
        if (targetSearch) {
          const match = (data.documents || []).find((d: TechnicalDocument) => 
            d.title.toLowerCase().includes(targetSearch.toLowerCase()) ||
            d.productName?.toLowerCase().includes(targetSearch.toLowerCase())
          );
          if (match) setPreviewDoc(match);
        }
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const isManagement = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  // Categories & Folders List
  const categories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set);
  }, [documents]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => { if (d.folderPath) set.add(d.folderPath); });
    return Array.from(set);
  }, [documents]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
      if (selectedFolder !== 'ALL' && doc.folderPath !== selectedFolder) return false;
      if (selectedDocType !== 'ALL' && doc.documentType !== selectedDocType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesProduct = doc.productName?.toLowerCase().includes(q);
        const matchesText = doc.extractedText?.toLowerCase().includes(q);
        const matchesTags = doc.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesProduct && !matchesText && !matchesTags) return false;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedFolder, selectedDocType, searchQuery]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFileName.trim()) {
      alert('Document Title and File Name are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          productName: uploadProductName.trim() || undefined,
          manufacturer: uploadManufacturer.trim() || 'Radiant Construction Technologies LLP',
          documentType: uploadDocType,
          category: uploadCategory.trim() || 'General',
          folderPath: uploadFolderPath.trim() || '/',
          version: uploadVersion.trim() || '1.0',
          fileName: uploadFileName.trim(),
          filePath: uploadFilePath.trim() || `/documents/${uploadFileName.trim()}`,
          fileSizeBytes: 250000,
          fileType: 'application/pdf',
          extractedText: uploadExtractedText.trim() || undefined,
          tags: uploadTags ? uploadTags.split(',').map(t => t.trim()).filter(Boolean) : [],
          visibility: uploadVisibility,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save document');
      }

      const data = await res.json();
      setDocuments(prev => [data.document, ...prev]);
      setIsUploadModalOpen(false);
      resetUploadForm();
    } catch (err: any) {
      alert(err.message || 'Error uploading document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this official technical document?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (previewDoc?.id === id) setPreviewDoc(null);
      } else {
        alert('Failed to delete document');
      }
    } catch {
      alert('Network error while deleting document');
    }
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadProductName('');
    setUploadManufacturer('Radiant Construction Technologies LLP');
    setUploadDocType('TDS');
    setUploadCategory('General');
    setUploadFolderPath('/');
    setUploadVersion('1.0');
    setUploadFileName('');
    setUploadFilePath('');
    setUploadExtractedText('');
    setUploadTags('');
    setUploadVisibility('ALL_SALES');
  };

  return (
    <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} onSearchChange={setSearchQuery} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#AF9292] to-[#B7937A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                📄
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Technical Data Sheets & Documents Library
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#AF9292]/15 text-[#AF9292]">
                {filteredDocuments.length} Verified Files
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official Technical Specifications, TDS, MSDS & Test Reports by Radiant Construction Technologies LLP
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isManagement && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#AF9292]/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>＋ Upload Document</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="korean-card p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search technical specs, coverage, ASTM standard, tags, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#AF9292]/20 focus:border-[#AF9292] focus:outline-none transition-all"
              />
            </div>

            {/* Document Type Filter */}
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Document Types</option>
              <option value="TDS">TDS (Technical Data Sheet)</option>
              <option value="MSDS">MSDS (Safety Data Sheet)</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="APPLICATION_GUIDE">Application Guides</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Folder Filter */}
            {folders.length > 0 && (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Folders</option>
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#AF9292] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading technical library...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="korean-card p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No documents found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id}
                className="korean-card p-5 hover:border-[#AF9292]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        doc.documentType === 'TDS'
                          ? 'bg-[#B7937A]/15 text-[#B7937A]'
                          : doc.documentType === 'MSDS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#BCAEC4]/20 text-[#6B5B7B]'
                      }`}>
                        {doc.documentType}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {doc.category}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        v{doc.version}
                      </span>
                    </div>

                    {doc.visibility === 'MANAGEMENT_ONLY' && (
                      <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        🔒 Management Only
                      </span>
                    )}
                  </div>

                  {/* Document Title */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#B7937A] transition-colors leading-snug">
                    {doc.title}
                  </h3>

                  {/* Manufacturer & Product */}
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    {doc.productName && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="text-slate-400">Product:</span>
                        <span className="font-semibold text-slate-800">{doc.productName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.manufacturer || 'Radiant Construction Technologies LLP'}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {doc.tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className="text-[10px] font-medium bg-[#F8F6F4] text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Spec</span>
                    </button>

                    {/* Download or view original file */}
                    <a
                      href={doc.filePath}
                      download={doc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#AF9292]/15 hover:bg-[#AF9292]/25 text-[#AF9292] text-xs font-bold flex items-center gap-1 transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>

                    {/* Management Delete */}
                    {isManagement && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#AF9292] via-[#B7937A] to-[#BCAEC4] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {previewDoc.documentType} • {previewDoc.category}
                </span>
                <h2 className="text-base font-bold mt-1 text-white">
                  {previewDoc.title}
                </h2>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Extracted Text View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs leading-relaxed text-slate-700 bg-[#F8F6F4]/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400">PRODUCT</span>
                  <p className="font-bold text-slate-800">{previewDoc.productName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400">MANUFACTURER</span>
                  <p className="font-bold text-slate-800">{previewDoc.manufacturer || 'Radiant Construction'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400">VERSION</span>
                  <p className="font-bold text-slate-800">v{previewDoc.version}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400">FILE TYPE</span>
                  <p className="font-bold text-slate-800">{previewDoc.fileType}</p>
                </div>
              </div>

              {previewDoc.extractedText ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                  <h4 className="font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verified Technical Specifications & Instructions:</span>
                  </h4>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 max-h-[350px] overflow-y-auto">
                    {previewDoc.extractedText}
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Preview text not available. Please download the document file.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Filename: <strong className="text-slate-800">{previewDoc.fileName}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                >
                  Close
                </button>
                <a
                  href={previewDoc.filePath}
                  download={previewDoc.fileName}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL (MANAGEMENT ONLY) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4 bg-gradient-to-r from-[#AF9292] via-[#B7937A] to-[#BCAEC4] text-white flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <span>Upload Technical Document / TDS / MSDS</span>
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tiger Shell Black TDS"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Product Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tiger Shell Black"
                    value={uploadProductName}
                    onChange={(e) => setUploadProductName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="TDS">TDS (Technical Data Sheet)</option>
                    <option value="MSDS">MSDS (Safety Data Sheet)</option>
                    <option value="CERTIFICATE">Certificate / Test Report</option>
                    <option value="APPLICATION_GUIDE">Application Guide</option>
                    <option value="CATALOG">Product Catalog</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Protective Coatings"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    File Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tiger_Shell_Black.pdf"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Version / Revision
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0 (Rev 2026)"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bitumen, Waterproofing, ASTM C920"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Access Visibility
                  </label>
                  <select
                    value={uploadVisibility}
                    onChange={(e) => setUploadVisibility(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="ALL_SALES">All Sales Employees & Management</option>
                    <option value="MANAGEMENT_ONLY">Management Only (Confidential)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Extracted Text / Specifications (for search and AI assistant retrieval)
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste or type technical data, coverage, mixing ratio, curing instructions, application guidelines..."
                  value={uploadExtractedText}
                  onChange={(e) => setUploadExtractedText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Upload & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Safe Copilot Assistant */}
      <SafeCopilot currentUser={currentUser} />
      <MobileNav />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F6F4]" />}>
      <DocumentsContent />
    </Suspense>
  );
}
