import React, { useState, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, Trash2, Eye, Layers, Clock,
  AlertTriangle, CheckCircle2, FileText, Sparkles, HardDrive
} from 'lucide-react';
import { UploadedFileInfo } from '../../types';
import { ConfirmModal } from './ConfirmModal';

interface FileDropzoneProps {
  files: UploadedFileInfo[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
  onPreview?: (fileId: string, sheetName?: string) => void;
  uploading?: boolean;
  isCleaningPassed?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onUpload,
  onRemove,
  onPreview,
  uploading = false,
  isCleaningPassed = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFileInfo | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Flatten files and sheets into direct extracted dataset items
  interface ExtractedItem {
    id: string;
    fileId: string;
    sheetName?: string;
    titleName: string;
    sourceWorkbookName: string;
    parentFile: UploadedFileInfo;
    format: string;
    fileSize: number;
    detectedDataset: string;
    confidence: number;
    status: string;
    rowCount?: number;
  }

  const extractedItems: ExtractedItem[] = [];
  files.forEach((file) => {
    if (file.sheets && file.sheets.length > 0) {
      file.sheets.forEach((s) => {
        extractedItems.push({
          id: `${file.fileId}_${s.sheetName}`,
          fileId: file.fileId,
          sheetName: s.sheetName,
          titleName: s.sheetName || file.originalName,
          sourceWorkbookName: file.originalName,
          parentFile: file,
          format: `${file.extension.toUpperCase()} (Sheet)`,
          fileSize: file.fileSize,
          detectedDataset: s.detectedDataset !== 'UNKNOWN' ? s.detectedDataset : 'DATASET_EXTRACT',
          confidence: s.confidence || 100,
          status: file.status || 'READY',
          rowCount: s.rowCount,
        });
      });
    } else {
      extractedItems.push({
        id: file.fileId,
        fileId: file.fileId,
        titleName: file.originalName,
        sourceWorkbookName: file.originalName,
        parentFile: file,
        format: file.extension.toUpperCase(),
        fileSize: file.fileSize,
        detectedDataset: file.detectedDataset,
        confidence: file.confidence,
        status: file.status || 'READY',
      });
    }
  });

  // Curated theme styling per dataset type
  const getDatasetTheme = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('TRIAL') || t === 'TB') {
      return {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        color: '#0284C7',
        badgeBg: '#F0F9FF',
        badgeColor: '#0369A1',
        badgeBorder: '#BAE6FD',
        dotColor: '#0284C7',
        label: 'TRIAL BALANCE',
      };
    }
    if (t.includes('GENERAL') || t.includes('POPULATION') || t === 'GL') {
      return {
        bg: '#E6F4F5',
        border: '#B2DFE2',
        color: '#007680',
        badgeBg: '#F0FDFA',
        badgeColor: '#005A60',
        badgeBorder: '#99F6E4',
        dotColor: '#007680',
        label: 'POPULATION / GL',
      };
    }
    if (t.includes('PARAM') || t.includes('INPUT') || t.includes('EXCEPTION') || t.includes('AUDIT_PARAM')) {
      return {
        bg: '#F0FDFA',
        border: '#B2DFE2',
        color: '#007680',
        badgeBg: '#F0FDFA',
        badgeColor: '#005A60',
        badgeBorder: '#99F6E4',
        dotColor: '#007680',
        label: 'INPUT PARAMETERS',
      };
    }
    if (t.includes('COA') || t.includes('CHART')) {
      return {
        bg: '#F0FDFA',
        border: '#CCFBF1',
        color: '#007680',
        badgeBg: '#F0FDFA',
        badgeColor: '#005A60',
        badgeBorder: '#99F6E4',
        dotColor: '#007680',
        label: 'CHART OF ACCOUNTS',
      };
    }
    return {
      bg: '#F8FAFC',
      border: '#E2E8F0',
      color: '#475569',
      badgeBg: '#F1F5F9',
      badgeColor: '#334155',
      badgeBorder: '#CBD5E1',
      dotColor: '#64748B',
      label: type.replace(/_/g, ' '),
    };
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept=".xlsx,.xls,.csv,.txt,.zip"
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* ── 2-COLUMN SPLIT: 35% (Upload Left) & 65% (File Info Right) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 35%) 1fr',
          gap: '18px',
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {/* ── LEFT COLUMN (35%): FILE UPLOAD DROPZONE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
              e.preventDefault();
              if (!uploading) fileInputRef.current?.click();
            }}
            style={{
              border: `2px dashed ${isDragOver ? '#007680' : 'rgba(0, 118, 128, 0.28)'}`,
              backgroundColor: isDragOver ? '#F0FDFA' : '#FAFCFD',
              borderRadius: '16px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isDragOver
                ? '0 0 20px rgba(0, 118, 128, 0.18)'
                : '0 1px 3px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '260px',
              flex: 1,
              position: 'relative',
            }}
          >
            {/* Pulsing Upload Icon Badge */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.12) 0%, rgba(0, 77, 84, 0.06) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#007680',
                border: '1px solid rgba(0, 118, 128, 0.22)',
                boxShadow: '0 4px 14px rgba(0, 118, 128, 0.12)',
              }}
            >
              <UploadCloud size={24} />
            </div>

            <h4
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '6px',
                letterSpacing: '-0.015em',
              }}
            >
              {uploading
                ? 'Inspecting & Ingesting...'
                : files.length === 0
                ? 'Upload Audit Datasets'
                : 'Upload / Add More Files'}
            </h4>

            <p
              style={{
                fontSize: '0.78rem',
                color: '#64748B',
                maxWidth: '260px',
                margin: '0 auto 14px',
                lineHeight: 1.45,
              }}
            >
              {files.length === 0 ? (
                <>
                  Upload raw <strong>Trial Balance</strong> and <strong>General Ledger / Population</strong> files or an all-in-one workbook.
                </>
              ) : (
                'Drop extra files here or click to browse'
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: '#007680',
                  background: '#E6F4F5',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #B2DFE2',
                  letterSpacing: '0.02em',
                }}
              >
                XLSX, XLS, CSV, TXT, ZIP
              </span>
            </div>
          </div>

          {/* Ingestion Summary Metrics Card (Shown when files exist) */}
          {files.length > 0 && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 14px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>INGESTION OVERVIEW</span>
                <span style={{ color: '#007680', fontWeight: 700 }}>Auto-Detected</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>Files</div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                    {files.length}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>Datasets</div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#007680', fontFamily: 'var(--font-mono, monospace)' }}>
                    {extractedItems.length}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>Total Size</div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                    {formatSize(files.reduce((sum, f) => sum + (f.fileSize || 0), 0))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (65%): VISUALLY STUNNING DATASET SECTION ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
            minHeight: '260px',
          }}
        >
          {/* Header Row: Title with Count + Prominent Cleaning Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              paddingBottom: '12px',
              borderBottom: '1px solid #F1F5F9',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, rgba(0, 118, 128, 0.12) 0%, rgba(0, 77, 84, 0.06) 100%)',
                  color: '#007680',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 118, 128, 0.20)',
                }}
              >
                <Layers size={17} />
              </div>

              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.015em' }}>
                  Extracted Audit Datasets
                </h4>
                {files.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                    {extractedItems.length} dataset{extractedItems.length === 1 ? '' : 's'} detected across {files.length} file{files.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {/* Prominent Cleaning Status Badge */}
            <div>
              {files.length === 0 ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: '#F1F5F9',
                    color: '#64748B',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <Clock size={12} /> Awaiting Files
                </span>
              ) : isCleaningPassed ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: '#F0FDFA',
                    color: '#007680',
                    border: '1px solid #99F6E4',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(0, 118, 128, 0.1)',
                  }}
                >
                  <CheckCircle2 size={13} color="#007680" /> CLEANING PASSED
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: '#FFFBEB',
                    color: '#D97706',
                    border: '1px solid #FDE68A',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#D97706',
                      boxShadow: '0 0 6px #D97706',
                    }}
                  />
                  CLEANING PENDING
                </span>
              )}
            </div>
          </div>

          {/* ── CASE A: ZERO FILES (Clean Empty State) ── */}
          {uploading && files.length === 0 ? (
            /* ── UPLOADING STATE: Skeleton loader ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#007680', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Sparkles size={14} className="spin-slow" />
                <span>Smart Inspection Engine — Detecting datasets and schema structures...</span>
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  height: '68px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  opacity: 0.8 - i * 0.2,
                }} />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '36px 20px',
                background: '#FAFCFD',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: '#EEF2F6',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                }}
              >
                <FileSpreadsheet size={26} />
              </div>
              <h5 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                No Datasets Uploaded Yet
              </h5>
              <p style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '360px', margin: '0 0 14px', lineHeight: 1.45 }}>
                Upload files on the left. The smart inspection engine will automatically detect and extract sheets, row counts, and data classifications here.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '7px',
                  fontSize: '0.72rem',
                  color: '#B45309',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={12} />
                <span>Cleaning status will remain PENDING until step 2 verification.</span>
              </div>
            </div>
          ) : (
            /* ── CASE B: VISUALLY STUNNING DATASET CARDS (Matching Image 1) ── */
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '360px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '2px',
              }}
            >
              {extractedItems.map((item) => {
                const theme = getDatasetTheme(item.detectedDataset);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(15, 23, 42, 0.05)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Left: Icon + Dataset Name + Workbook Reference */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: theme.color,
                          flexShrink: 0,
                        }}
                      >
                        <FileSpreadsheet size={18} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            data-ai-context="field"
                            style={{
                              fontWeight: 800,
                              color: '#0F172A',
                              fontSize: '0.86rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '220px',
                              letterSpacing: '-0.01em',
                            }}
                            title={item.titleName}
                          >
                            {item.titleName}
                          </span>

                          {item.sheetName && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#64748B',
                                background: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              Sheet
                            </span>
                          )}
                        </div>

                        {/* Meta Tags: Rows • Size • Workbook */}
                        <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          {item.rowCount !== undefined && item.rowCount > 0 && (
                            <span data-ai-context="metric" style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
                              {item.rowCount.toLocaleString()} rows
                            </span>
                          )}
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{formatSize(item.fileSize)}</span>
                          {item.sheetName && (
                            <>
                              <span>•</span>
                              <span
                                style={{
                                  maxWidth: '140px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={item.sourceWorkbookName}
                              >
                                {item.sourceWorkbookName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Classification Tag & Confidence Score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        data-ai-context="label"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: theme.badgeBg,
                          color: theme.badgeColor,
                          border: `1px solid ${theme.badgeBorder}`,
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: theme.dotColor,
                          }}
                        />
                        {theme.label}
                      </span>

                      {/* Confidence Pill */}
                      <span
                        data-ai-context="metric"
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#475569',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {item.confidence}% Match
                      </span>
                    </div>

                    {/* Right: Cleaning Status & Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {/* Cleaning Status Pill */}
                      {isCleaningPassed ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#007680',
                            background: '#F0FDFA',
                            border: '1px solid #99F6E4',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={11} color="#007680" /> Cleaned
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: '#D97706',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={11} /> Pending
                        </span>
                      )}

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onPreview?.(item.fileId, item.sheetName);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 9px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#FFFFFF',
                          color: '#007680',
                          border: '1px solid rgba(0, 118, 128, 0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0FDFA';
                          e.currentTarget.style.borderColor = '#007680';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.borderColor = 'rgba(0, 118, 128, 0.3)';
                        }}
                        title={`Preview ${item.titleName}`}
                      >
                        <Eye size={12} /> Preview
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFileToDelete(item.parentFile);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 7px',
                          background: '#FFF1F2',
                          color: '#E11D48',
                          border: '1px solid #FFE4E6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FEE2E2';
                          e.currentTarget.style.borderColor = '#FDA4AF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FFF1F2';
                          e.currentTarget.style.borderColor = '#FFE4E6';
                        }}
                        title={`Delete ${item.parentFile.originalName}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(fileToDelete)}
        onClose={() => setFileToDelete(null)}
        onConfirm={async () => {
          if (!fileToDelete) return;
          setIsRemoving(true);
          try {
            await onRemove(fileToDelete.fileId);
            setFileToDelete(null);
          } finally {
            setIsRemoving(false);
          }
        }}
        title={fileToDelete ? `Delete ${fileToDelete.originalName}?` : 'Delete this file?'}
        message="Once you delete this, it will be permanently removed from your workspace."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
};
