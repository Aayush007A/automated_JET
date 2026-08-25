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

  return (
    <div>
      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--deloitte-teal)' : '#CBD5E1'}`,
          backgroundColor: isDragOver ? 'var(--deloitte-teal-light)' : '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: isDragOver ? '0 0 20px var(--deloitte-teal-glow)' : 'var(--shadow-sm)',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".xlsx,.xls,.csv,.txt,.zip"
          style={{ display: 'none' }}
          disabled={uploading}
        />
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
          <UploadCloud size={32} />
        </div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
          {uploading ? 'Inspecting & Parsing Files...' : 'Drag & Drop JET Input Files Here'}
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 14px' }}>
          Upload separate files (<strong>TB.csv, Population.csv, COA.csv</strong>) or a single multi-sheet workbook (<strong>JET_Input.xlsx</strong>).
        </p>
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.76rem',
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

      {/* Uploaded Files / Extracted Datasets Table */}
      {files.length > 0 && (() => {
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
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Extracted Datasets ({extractedItems.length} {extractedItems.length === 1 ? 'dataset' : 'datasets'} from {files.length} {files.length === 1 ? 'file' : 'files'})
                </h4>
              </div>
            </div>

            <div className="table-container">
              <table className="jet-table">
                <thead>
                  <tr>
                    <th>Extracted Dataset / Sheet</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>Detected Dataset</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: item.sheetName ? 'var(--deloitte-teal-light)' : '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: item.sheetName ? 'var(--deloitte-teal)' : '#2563EB',
                              flexShrink: 0,
                            }}
                          >
                            <FileSpreadsheet size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {item.displayName}
                            </div>
                            {item.rowCount !== undefined && item.rowCount > 0 && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {item.rowCount.toLocaleString()} rows detected
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{item.format}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {formatSize(item.fileSize)}
                      </td>
                      <td>
                        <StatusBadge status={item.detectedDataset.replace(/_/g, ' ')} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '60px',
                              height: '6px',
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
                          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {item.confidence}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               onPreview?.(item.fileId, item.sheetName);
                             }}
                             style={{
                               display: 'inline-flex', alignItems: 'center', gap: '6px',
                               padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700,
                               background: 'rgba(0, 118, 128, 0.06)',
                               color: 'var(--deloitte-teal)',
                               border: '1.5px solid rgba(0, 118, 128, 0.3)',
                               borderRadius: '8px', cursor: 'pointer',
                               transition: 'all 0.18s ease',
                               letterSpacing: '0.01em',
                             }}
                             onMouseEnter={e => {
                               (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 118, 128, 0.12)';
                               (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--deloitte-teal)';
                               (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                             }}
                             onMouseLeave={e => {
                               (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 118, 128, 0.06)';
                               (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 118, 128, 0.3)';
                               (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                             }}
                             title={`Preview sample records for ${item.displayName}`}
                           >
                             <Eye size={13} />
                             <span>Preview</span>
                           </button>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               setFileToDelete(item.parentFile);
                             }}
                             style={{
                               display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                               padding: '5px 9px', background: 'rgba(239, 68, 68, 0.06)',
                               color: 'var(--status-error)', border: '1.5px solid rgba(239, 68, 68, 0.2)',
                               borderRadius: '8px', cursor: 'pointer', transition: 'all 0.18s ease',
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
                             <Trash2 size={14} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
