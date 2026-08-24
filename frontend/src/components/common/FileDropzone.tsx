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

      {/* Uploaded Files Table */}
      {files.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Detected Datasets ({files.length} {files.length === 1 ? 'file' : 'files'})
            </h4>
          </div>

          <div className="table-container">
            <table className="jet-table">
              <thead>
                <tr>
                  <th>File Name / Sheets</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>Detected Dataset</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.fileId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--deloitte-teal-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--deloitte-teal)',
                            marginTop: '2px',
                          }}
                        >
                          <FileSpreadsheet size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{file.originalName}</div>
                          {file.sheets && file.sheets.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {file.sheets.map((s) => (
                                <button
                                  key={s.sheetName}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPreview?.(file.fileId, s.sheetName);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.74rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: '#F1F5F9',
                                    border: '1px solid #CBD5E1',
                                    color: 'var(--deloitte-teal)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                  title={`Preview 50 sample rows for sheet "${s.sheetName}"`}
                                >
                                  <Eye size={12} />
                                  <span>{s.sheetName}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>({s.detectedDataset})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{file.extension.toUpperCase()}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>{formatSize(file.fileSize)}</td>
                    <td>
                      <StatusBadge status={file.detectedDataset.replace(/_/g, ' ')} />
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
                              width: `${file.confidence}%`,
                              height: '100%',
                              background: file.confidence >= 80 ? 'var(--deloitte-green-dark)' : 'var(--status-warning)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {file.confidence}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={file.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(file.fileId);
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', gap: '4px' }}
                          title="Preview Sample 50 Rows"
                        >
                          <Eye size={14} color="var(--deloitte-teal)" />
                          <span>Preview (50)</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(file);
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', color: 'var(--status-error)' }}
                          title="Remove file"
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
