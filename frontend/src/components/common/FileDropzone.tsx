import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle, AlertCircle, File, Eye } from 'lucide-react';
import { UploadedFileInfo } from '../../types';
import { StatusBadge } from './StatusBadge';
import { ConfirmModal } from './ConfirmModal';

interface FileDropzoneProps {
  files: UploadedFileInfo[];
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
  onPreview?: (fileId: string, sheetName?: string) => void;
  uploading?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onUpload,
  onRemove,
  onPreview,
  uploading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<UploadedFileInfo | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Flatten files and sheets into direct extracted dataset items
  interface ExtractedItem {
    id: string;
    fileId: string;
    sheetName?: string;
    displayName: string;
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
          displayName: `${file.originalName} → ${s.sheetName}`,
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
        displayName: file.originalName,
        parentFile: file,
        format: file.extension.toUpperCase(),
        fileSize: file.fileSize,
        detectedDataset: file.detectedDataset,
        confidence: file.confidence,
        status: file.status || 'READY',
      });
    }
  });

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept=".xlsx,.xls,.csv,.txt,.zip"
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* ── CASE 1: ZERO FILES UPLOADED (Centered Full Dropzone) ── */}
      {files.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? 'var(--deloitte-teal)' : '#CBD5E1'}`,
            backgroundColor: isDragOver ? 'var(--deloitte-teal-light)' : '#FAFCFC',
            borderRadius: '14px',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: isDragOver ? '0 0 20px var(--deloitte-teal-glow)' : 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--deloitte-teal-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--deloitte-teal)',
              border: '1px solid rgba(0, 118, 128, 0.2)',
            }}
          >
            <UploadCloud size={30} />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {uploading ? 'Inspecting & Parsing Files...' : 'Drag & Drop JET Input Files Here'}
          </h4>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 14px' }}>
            Upload separate files (<strong>TB.csv, Population.csv, COA.csv</strong>) or a single multi-sheet workbook (<strong>JET_Input.xlsx</strong>).
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Supported Formats: XLSX, XLS, CSV, TXT, ZIP
          </span>
        </div>
      ) : (
        /* ── CASE 2: FILES UPLOADED (Side-by-Side Left & Right Layout) ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: '310px minmax(0, 1fr)',
          gap: '22px',
          alignItems: 'stretch'
        }}>
          {/* Left Column: Compact Dropzone & Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--deloitte-teal)' : '#CBD5E1'}`,
                backgroundColor: isDragOver ? 'var(--deloitte-teal-light)' : '#FAFCFC',
                borderRadius: '12px',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.22s ease',
                boxShadow: isDragOver ? '0 0 16px var(--deloitte-teal-glow)' : 'none',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--deloitte-teal-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  color: 'var(--deloitte-teal)',
                  border: '1px solid rgba(0, 118, 128, 0.2)',
                }}
              >
                <UploadCloud size={22} />
              </div>
              <h5 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {uploading ? 'Processing...' : 'Upload / Add More Files'}
              </h5>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                Drop extra files or click to browse
              </p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--deloitte-teal)',
                  background: 'var(--deloitte-teal-light)',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(0, 118, 128, 0.25)',
                }}
              >
                XLSX, XLS, CSV, ZIP
              </span>
            </div>

            {/* Ingestion Meta Summary Card */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Ingestion Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Uploaded Files</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{files.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Extracted Datasets</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#007680', fontFamily: 'var(--font-mono)' }}>{extractedItems.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Ingested Size</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', fontFamily: 'var(--font-mono)' }}>
                    {formatSize(files.reduce((sum, f) => sum + f.fileSize, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Extracted Datasets Table */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Extracted Datasets ({extractedItems.length} {extractedItems.length === 1 ? 'dataset' : 'datasets'} from {files.length} {files.length === 1 ? 'file' : 'files'})
              </h4>
            </div>

            <div className="table-container" style={{ flex: 1, maxHeight: '380px', overflowY: 'auto' }}>
              <table className="jet-table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr>
                    <th style={{ background: '#F8FAFC' }}>Extracted Dataset / Sheet</th>
                    <th style={{ background: '#F8FAFC' }}>Format</th>
                    <th style={{ background: '#F8FAFC' }}>Size</th>
                    <th style={{ background: '#F8FAFC' }}>Detected Dataset</th>
                    <th style={{ background: '#F8FAFC' }}>Confidence</th>
                    <th style={{ background: '#F8FAFC' }}>Status</th>
                    <th style={{ textAlign: 'right', background: '#F8FAFC' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '7px',
                              background: item.sheetName ? 'var(--deloitte-teal-light)' : '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: item.sheetName ? 'var(--deloitte-teal)' : '#2563EB',
                              flexShrink: 0,
                            }}
                          >
                            <FileSpreadsheet size={15} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.displayName}
                            </div>
                            {item.rowCount !== undefined && item.rowCount > 0 && (
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                {item.rowCount.toLocaleString()} rows detected
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{item.format}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#334155' }}>
                        {formatSize(item.fileSize)}
                      </td>
                      <td>
                        <StatusBadge status={item.detectedDataset.replace(/_/g, ' ')} size="sm" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '50px',
                              height: '5px',
                              background: '#E2E8F0',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${item.confidence}%`,
                                height: '100%',
                                background: item.confidence >= 80 ? 'var(--deloitte-green-dark)' : 'var(--status-warning)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {item.confidence}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreview?.(item.fileId, item.sheetName);
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 8px', fontSize: '0.70rem', fontWeight: 700,
                              background: 'var(--deloitte-teal-light)',
                              color: 'var(--deloitte-teal)',
                              border: '1px solid rgba(0, 118, 128, 0.25)',
                              borderRadius: '5px', cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Preview ${item.displayName}`}
                          >
                            <Eye size={11} /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(item.parentFile);
                            }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '4px 8px', background: 'rgba(239, 68, 68, 0.06)',
                              color: 'var(--status-error)', border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s ease',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.12)';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--status-error)';
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.06)';
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                            title={`Remove ${item.parentFile.originalName}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM REMOVE FILE CONFIRMATION MODAL */}
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
        title={fileToDelete ? `Remove ${fileToDelete.originalName}?` : 'Remove File'}
        message="Are you sure you want to remove this dataset from the execution workspace? Its extracted sheets, canonical field mappings, and cached sample records will be cleared."
        confirmText="Remove File"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemoving}
        itemDetails={fileToDelete ? [
          { label: 'File Name', value: fileToDelete.originalName },
          { label: 'Detected Dataset', value: fileToDelete.detectedDataset.replace(/_/g, ' ') },
          { label: 'File Size', value: formatSize(fileToDelete.fileSize) },
        ] : []}
      />
    </div>
  );
};
