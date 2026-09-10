import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { churnApi } from '../services/api';
import { datasetStore } from '../services/datasetStore';
import GlassCard from '../components/GlassCard';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'datasetAnalysisState';
const SELECTED_CUSTOMER_KEY = 'selectedDatasetCustomer';

const getInitialStep = (saved) => {
  if (!saved) return 'upload';
  if (saved.results && saved.results.customerResults && saved.results.customerResults.length > 0) return 'results';
  if (saved.step === 'training') return saved.csvContent ? 'preview' : 'upload';
  return saved.step || 'upload';
};

export default function DatasetAnalysis() {
  const navigate = useNavigate();

  // Load persisted state from in-memory store first, then fallback to sessionStorage
  const [persistedState] = useState(() => {
    const inMemory = datasetStore.getState();
    if (inMemory && inMemory.step) return inMemory;

    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState(() => getInitialStep(persistedState));
  const [fileInfo, setFileInfo] = useState(persistedState?.fileInfo || null);
  const [csvContent, setCsvContent] = useState(persistedState?.csvContent || '');
  const [previewRows, setPreviewRows] = useState(persistedState?.previewRows || []);
  const [previewHeaders, setPreviewHeaders] = useState(persistedState?.previewHeaders || []);
  const [missingSummary, setMissingSummary] = useState(persistedState?.missingSummary || {});
  const [availableColumns, setAvailableColumns] = useState(persistedState?.availableColumns || []);

  const [columnDetection, setColumnDetection] = useState(
    persistedState?.columnDetection || {
      numeric: [],
      categorical: [],
      customerId: null,
      target: null,
      targetClasses: [],
    }
  );

  const [confirmedColumns, setConfirmedColumns] = useState(
    persistedState?.confirmedColumns || {
      targetColumn: '',
      customerIdColumn: '',
      positiveClass: 'Yes',
    }
  );

  const [training, setTraining] = useState({
    isTraining: false,
    message: '',
  });

  const [results, setResults] = useState(persistedState?.results || null);
  const [downloading, setDownloading] = useState(false);
  const [filter, setFilter] = useState(persistedState?.filter || 'ALL');
  const [searchQuery, setSearchQuery] = useState(persistedState?.searchQuery || '');
  const [sortConfig, setSortConfig] = useState(persistedState?.sortConfig || { key: 'churn_probability', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(persistedState?.currentPage || 1);
  const [pageSize, setPageSize] = useState(persistedState?.pageSize || 25);
  const [errorMessage, setErrorMessage] = useState('');

  // Persist state to in-memory store whenever key state changes
  useEffect(() => {
    if (step === 'upload' && !csvContent) {
      datasetStore.clearState();
      return;
    }
    const stateToSave = {
      step: step === 'training' ? (results ? 'results' : 'preview') : step,
      fileInfo,
      csvContent,
      previewRows,
      previewHeaders,
      missingSummary,
      availableColumns,
      columnDetection,
      confirmedColumns,
      results,
      filter,
      searchQuery,
      sortConfig,
      currentPage,
      pageSize,
    };
    datasetStore.setState(stateToSave);
  }, [
    step,
    fileInfo,
    csvContent,
    previewRows,
    previewHeaders,
    missingSummary,
    availableColumns,
    columnDetection,
    confirmedColumns,
    results,
    filter,
    searchQuery,
    sortConfig,
    currentPage,
    pageSize,
  ]);

  const handleReset = () => {
    datasetStore.clearState();
    setStep('upload');
    setFileInfo(null);
    setCsvContent('');
    setPreviewRows([]);
    setPreviewHeaders([]);
    setMissingSummary({});
    setAvailableColumns([]);
    setColumnDetection({
      numeric: [],
      categorical: [],
      customerId: null,
      target: null,
      targetClasses: [],
    });
    setConfirmedColumns({
      targetColumn: '',
      customerIdColumn: '',
      positiveClass: 'Yes',
    });
    setResults(null);
    setSearchQuery('');
    setFilter('ALL');
    setSortConfig({ key: 'churn_probability', direction: 'desc' });
    setCurrentPage(1);
    setErrorMessage('');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setErrorMessage('');

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please select a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content !== 'string' || !content.trim()) {
        setErrorMessage('The selected CSV file is empty.');
        return;
      }
      processUploadedCSV(content, selected.name, selected.size);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the file. Please try again.');
    };
    reader.readAsText(selected);
  };

  const processUploadedCSV = (content, fileName, fileSize) => {
    try {
      const rawLines = content.trim().split(/\r?\n/);
      if (rawLines.length < 2) {
        setErrorMessage('CSV file must have at least a header row and one data row.');
        return;
      }

      // Simple CSV parser supporting quotes
      const parseCSVLine = (text) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      const headers = parseCSVLine(rawLines[0]);
      if (headers.length < 2) {
        setErrorMessage('CSV must contain at least 2 columns (features + target).');
        return;
      }

      const rows = [];
      const missingCounts = {};
      headers.forEach((h) => {
        missingCounts[h] = 0;
      });

      for (let r = 1; r < Math.min(rawLines.length, 1001); r++) {
        if (!rawLines[r].trim()) continue;
        const cols = parseCSVLine(rawLines[r]);
        if (cols.length === headers.length) {
          rows.push(cols);
          cols.forEach((val, idx) => {
            if (val === '' || val === undefined || val === null || val.toLowerCase() === 'nan' || val.toLowerCase() === 'null') {
              missingCounts[headers[idx]] = (missingCounts[headers[idx]] || 0) + 1;
            }
          });
        }
      }

      if (rows.length === 0) {
        setErrorMessage('Could not parse any valid data rows from CSV.');
        return;
      }

      const numeric = [];
      const categorical = [];

      headers.forEach((h, colIdx) => {
        let numericCount = 0;
        let totalCount = 0;
        rows.forEach((row) => {
          const val = (row[colIdx] || '').trim();
          if (val !== '' && val !== ' ' && val !== 'NaN' && val !== 'null') {
            totalCount++;
            if (!isNaN(Number(val))) {
              numericCount++;
            }
          }
        });
        if (totalCount > 0 && numericCount / totalCount >= 0.8) {
          numeric.push(h);
        } else {
          categorical.push(h);
        }
      });

      // Find candidate customer ID column
      const idCandidate = headers.find((h) =>
        /^(customer[._-]?id|customerid|id|client[._-]?id|user[._-]?id)$/i.test(h.trim())
      ) || null;

      // Find candidate target column
      const targetCandidate = headers.find((h) =>
        /^(churn|target|attrition|cancellation|is_churn|churned)$/i.test(h.trim())
      ) || null;

      // Detect unique classes in target candidate if found
      let targetClasses = [];
      if (targetCandidate) {
        const targetIdx = headers.indexOf(targetCandidate);
        const uniqueSet = new Set();
        rows.forEach((r) => {
          const v = (r[targetIdx] || '').trim();
          if (v) uniqueSet.add(v);
        });
        targetClasses = Array.from(uniqueSet);
      }

      let detectedPosClass = 'Yes';
      if (targetClasses.length > 0) {
        if (targetClasses.includes('Yes')) detectedPosClass = 'Yes';
        else if (targetClasses.includes('1')) detectedPosClass = '1';
        else if (targetClasses.includes('True')) detectedPosClass = 'True';
        else detectedPosClass = targetClasses[0];
      }

      setFileInfo({
        name: fileName,
        size: fileSize,
        rowCount: rawLines.length - 1,
        columnCount: headers.length,
      });
      setCsvContent(content);
      setPreviewHeaders(headers);
      setPreviewRows(rows.slice(0, 5));
      setMissingSummary(missingCounts);
      setAvailableColumns(headers);
      setColumnDetection({
        numeric,
        categorical,
        customerId: idCandidate,
        target: targetCandidate,
        targetClasses,
      });
      setConfirmedColumns({
        targetColumn: targetCandidate || (headers[headers.length - 1] || ''),
        customerIdColumn: idCandidate || '',
        positiveClass: detectedPosClass,
      });
      setStep('preview');
    } catch (err) {
      setErrorMessage(`Failed to process CSV: ${err.message}`);
    }
  };

  const handleTargetChange = (newTarget) => {
    const targetIdx = previewHeaders.indexOf(newTarget);
    let classes = [];
    if (targetIdx !== -1) {
      const uniqueSet = new Set();
      previewRows.forEach((r) => {
        const v = (r[targetIdx] || '').trim();
        if (v) uniqueSet.add(v);
      });
      classes = Array.from(uniqueSet);
    }
    setColumnDetection((prev) => ({
      ...prev,
      target: newTarget,
      targetClasses: classes,
    }));
    setConfirmedColumns((prev) => ({
      ...prev,
      targetColumn: newTarget,
      positiveClass: classes.includes('Yes') ? 'Yes' : classes[0] || 'Yes',
    }));
  };

  const handleTrain = async () => {
    if (!confirmedColumns.targetColumn) {
      setErrorMessage('Please select a target column before training.');
      return;
    }

    setErrorMessage('');
    setTraining({ isTraining: true, message: 'Training XGBoost model & computing batch predictions...' });
    setStep('training');

    try {
      const payload = {
        csv_content: csvContent,
        target_column: confirmedColumns.targetColumn,
        customer_id_column: confirmedColumns.customerIdColumn || null,
        positive_class: confirmedColumns.positiveClass || 'Yes',
      };

      const data = await churnApi.analyzeDataset(payload);
      setResults(data);
      setStep('results');
      setCurrentPage(1);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Dataset analysis failed';
      setErrorMessage(detail);
      setStep('preview');
    } finally {
      setTraining({ isTraining: false, message: '' });
    }
  };

  // Filter and Sort Customers
  const processedCustomerResults = useMemo(() => {
    if (!results?.customerResults) return [];

    let list = [...results.customerResults];

    // Risk Filter
    if (filter !== 'ALL') {
      list = list.filter((c) => c.risk_level === filter);
    }

    // Search Query (by Customer ID)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => String(c.customer_id || '').toLowerCase().includes(q));
    }

    // Sorting
    if (sortConfig.key) {
      list.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'churn_probability') {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [results, filter, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processedCustomerResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCustomerResults.slice(start, start + pageSize);
  }, [processedCustomerResults, currentPage, pageSize]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleViewDetails = (customer) => {
    const rawFeatures = customer.features || {};

    const customerDetailsPayload = {
      customer_id: customer.customer_id,
      formData: {
        ...rawFeatures,
        customerID: customer.customer_id,
        tenure: rawFeatures.tenure !== undefined ? Number(rawFeatures.tenure) : 12,
        MonthlyCharges: rawFeatures.MonthlyCharges !== undefined ? Number(rawFeatures.MonthlyCharges) : 85,
        TotalCharges: rawFeatures.TotalCharges !== undefined ? Number(rawFeatures.TotalCharges) : 1020,
      },
      result: {
        churn_probability: customer.churn_probability,
        risk_level: customer.risk_level,
        risk_color: customer.risk_color,
        churn_explanation: customer.churn_explanation || `Top churn driver: ${customer.top_driver}. ${customer.recommended_action}`,
        shap_values: customer.shap_values || {},
        recommendations: customer.recommendations || [],
        roi_data: {
          revenue_at_risk: Number(rawFeatures.MonthlyCharges || 85) * (customer.churn_probability / 100) * 12,
          retention_cost: Number(rawFeatures.MonthlyCharges || 85) * 0.15 * 3,
          clv: Number(rawFeatures.MonthlyCharges || 85) * 24,
          roi_ratio: Number((((rawFeatures.MonthlyCharges || 85) * (customer.churn_probability / 100) * 12) / Math.max(1, (rawFeatures.MonthlyCharges || 85) * 0.15 * 3)).toFixed(1)),
        },
        dynamic_roi_data: null,
      },
      source: 'dataset',
    };

    datasetStore.setSelectedCustomer(customerDetailsPayload);
    navigate('/predict');
  };

  const downloadCsv = () => {
    if (!results?.customerResults || results.customerResults.length === 0) return;

    setDownloading(true);
    try {
      const allRows = results.customerResults;
      const featureKeys = allRows[0]?.features ? Object.keys(allRows[0].features) : [];

      const headers = [
        'customer_id',
        'churn_probability',
        'risk_level',
        'top_driver',
        'recommended_action',
        ...featureKeys,
      ];

      const csvLines = [headers.join(',')];

      allRows.forEach((row) => {
        const lineVals = [
          `"${String(row.customer_id || '').replace(/"/g, '""')}"`,
          row.churn_probability,
          `"${String(row.risk_level || '').replace(/"/g, '""')}"`,
          `"${String(row.top_driver || '').replace(/"/g, '""')}"`,
          `"${String(row.recommended_action || '').replace(/"/g, '""')}"`,
          ...featureKeys.map((fk) => {
            const val = row.features?.[fk];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          }),
        ];
        csvLines.push(lineVals.join(','));
      });

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `churn_predictions_${fileInfo?.name || 'dataset'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <header className="glass-panel p-6 md:p-8 lg:p-9 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-primary/15 blur-[90px]" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="metric-chip mb-3">Bulk Analysis</div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight premium-gradient-text">
              Dataset Churn Analysis
            </h2>
            <p className="font-sans text-sm md:text-base text-on-surface mt-2 max-w-3xl leading-relaxed">
              Upload customer CSV data, train isolated XGBoost models, score entire cohorts, and inspect individual risk profiles.
            </p>
          </div>
          {step !== 'upload' && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-xs font-mono uppercase tracking-[0.16em] text-primary hover:bg-primary hover:text-slate-950 transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
            >
              <Upload size={14} />
              Upload Different CSV
            </button>
          )}
        </div>
      </header>

      {/* Error Alert */}
      {errorMessage && (
        <div className="glass-panel border-l-4 border-tertiary p-5 rounded-r-xl flex items-start gap-3 luxury-border animate-in fade-in duration-300">
          <AlertCircle className="text-tertiary shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-tertiary font-bold">Error</p>
            <p className="font-sans text-sm text-on-surface mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-12">
            <GlassCard glow paddingClass="p-8 md:p-10">
              <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  <Upload size={28} />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-on-surface">Upload Customer Dataset</h3>
                  <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                    Upload any customer CSV file (e.g. Telco customer churn dataset with 7,043 rows). The platform will automatically inspect columns, detect targets, train an XGBoost model, and score every customer.
                  </p>
                </div>

                <label className="w-full max-w-lg cursor-pointer group">
                  <div className="border-2 border-dashed border-primary/30 group-hover:border-primary rounded-2xl p-8 transition-all duration-300 bg-surface-low/50 group-hover:bg-primary/[0.03]">
                    <FileText className="mx-auto text-primary/60 group-hover:text-primary mb-3 transition-colors" size={32} />
                    <span className="block font-medium text-sm text-on-surface">Click to select or drag CSV file here</span>
                    <span className="block font-mono text-xs text-on-surface-variant mt-1">.CSV files supported</span>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </GlassCard>
          </section>
        </div>
      )}

      {/* STEP 2: PREVIEW & COLUMN CONFIRMATION */}
      {step === 'preview' && fileInfo && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* File Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-primary/20">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">File Name</p>
              <p className="font-display text-base text-on-surface truncate" title={fileInfo.name}>{fileInfo.name}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-primary/20">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Total Rows</p>
              <p className="font-display text-2xl text-on-surface">{fileInfo.rowCount.toLocaleString()}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-primary/20">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Columns</p>
              <p className="font-display text-2xl text-primary">{fileInfo.columnCount}</p>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-primary/20">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Missing Values</p>
              <p className="font-display text-2xl text-on-surface">
                {Object.values(missingSummary).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>

          {/* Column Configuration Card */}
          <GlassCard glow paddingClass="p-6 md:p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-primary" size={20} />
                <h3 className="font-display text-xl font-bold text-on-surface">Column Detection &amp; Model Setup</h3>
              </div>
              <p className="text-sm text-on-surface-variant">
                We automatically detected candidate target and ID columns. Review and confirm configuration before training.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Target Column Selector */}
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-primary flex items-center gap-1.5">
                    Target / Churn Column <span className="text-tertiary">*</span>
                  </label>
                  <select
                    value={confirmedColumns.targetColumn}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full rounded-xl border border-primary/30 bg-surface-low/90 px-3.5 py-3 text-sm text-on-surface font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === columnDetection.target ? '(Detected Target)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer ID Column Selector */}
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    Customer ID Column (Optional)
                  </label>
                  <select
                    value={confirmedColumns.customerIdColumn}
                    onChange={(e) => setConfirmedColumns((prev) => ({ ...prev, customerIdColumn: e.target.value }))}
                    className="w-full rounded-xl border border-primary/20 bg-surface-low/90 px-3.5 py-3 text-sm text-on-surface font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Auto-generate Row IDs --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col} {col === columnDetection.customerId ? '(Detected ID)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Positive / Churn Class */}
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                    Positive / Churn Class
                  </label>
                  {columnDetection.targetClasses.length > 0 ? (
                    <select
                      value={confirmedColumns.positiveClass}
                      onChange={(e) => setConfirmedColumns((prev) => ({ ...prev, positiveClass: e.target.value }))}
                      className="w-full rounded-xl border border-primary/20 bg-surface-low/90 px-3.5 py-3 text-sm text-on-surface font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {columnDetection.targetClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={confirmedColumns.positiveClass}
                      onChange={(e) => setConfirmedColumns((prev) => ({ ...prev, positiveClass: e.target.value }))}
                      placeholder="e.g. Yes or 1"
                      className="w-full rounded-xl border border-primary/20 bg-surface-low/90 px-3.5 py-3 text-sm text-on-surface font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </div>
              </div>

              {/* Detected Feature Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-primary/10">
                <div className="p-3.5 rounded-xl bg-surface-high/20 border border-primary/15">
                  <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-2 font-bold">
                    Numeric Features ({columnDetection.numeric.length})
                  </p>
                  <p className="font-mono text-xs text-on-surface-variant line-clamp-2">
                    {columnDetection.numeric.join(', ') || 'None'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-high/20 border border-primary/15">
                  <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em] mb-2 font-bold">
                    Categorical Features ({columnDetection.categorical.length})
                  </p>
                  <p className="font-mono text-xs text-on-surface-variant line-clamp-2">
                    {columnDetection.categorical.join(', ') || 'None'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-primary/15">
                <button
                  type="button"
                  onClick={handleTrain}
                  className="px-8 py-3.5 rounded-xl bg-primary text-slate-950 font-bold text-sm tracking-[0.12em] uppercase transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.28)] hover:bg-cyan-300"
                >
                  Train Model &amp; Predict All Customers
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-primary/30 bg-surface-high/40 text-on-surface text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Upload size={15} />
                  Choose Different CSV File
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Dataset Preview Table */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary mb-3">Dataset Preview (First 5 Rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-primary/20 bg-surface-high/30 font-mono">
                    {previewHeaders.map((h) => (
                      <th key={h} className="p-2.5 whitespace-nowrap text-on-surface font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-primary/10 hover:bg-white/[0.02]">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 whitespace-nowrap font-mono text-on-surface-variant">
                          {cell || <span className="text-white/20 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: TRAINING IN PROGRESS */}
      {step === 'training' && (
        <GlassCard glow paddingClass="p-12">
          <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div>
              <h3 className="font-display text-2xl font-bold text-on-surface">Training isolated XGBoost model...</h3>
              <p className="font-sans text-sm text-on-surface-variant mt-2 leading-relaxed">
                {training.message || 'Preprocessing data safely, running stratified train/test split, training XGBoost, and scoring all customers...'}
              </p>
            </div>
            <div className="w-full bg-surface-high/30 rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '75%' }} />
            </div>
            <button
              type="button"
              onClick={() => {
                setTraining({ isTraining: false, message: '' });
                setStep(csvContent ? 'preview' : 'upload');
              }}
              className="mt-4 px-6 py-2.5 rounded-xl border border-primary/20 bg-surface-high/40 text-xs font-mono uppercase tracking-[0.14em] text-on-surface hover:text-primary hover:border-primary/40 transition-colors"
            >
              Cancel Training
            </button>
          </div>
        </GlassCard>
      )}

      {/* STEP 4: RESULTS */}
      {step === 'results' && results && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Dataset Summary Cards */}
          {results.datasetSummary && (
            <div className="glass-panel p-6 md:p-7 rounded-2xl">
              <h3 className="font-mono text-xs font-semibold text-primary uppercase tracking-[0.22em] mb-4">
                Dataset Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Total Scored</p>
                  <p className="font-display text-3xl text-on-surface">{results.datasetSummary.rows.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Features</p>
                  <p className="font-display text-3xl text-on-surface">{results.datasetSummary.features}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Overall Churn Rate</p>
                  <p className="font-display text-3xl text-primary glow-text">{results.datasetSummary.churn_rate}%</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Missing Handled</p>
                  <p className="font-display text-3xl text-on-surface">{results.datasetSummary.missing_values}</p>
                </div>
              </div>
            </div>
          )}

          {/* Model Performance Cards */}
          {results.modelSummary && (
            <div className="glass-panel p-6 md:p-7 rounded-2xl luxury-border">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-primary" />
                <h3 className="font-mono text-xs font-semibold text-primary uppercase tracking-[0.22em]">
                  Model Performance (Test Set Evaluation)
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Model</p>
                  <p className="font-display text-lg text-on-surface font-semibold">{results.modelSummary.model_used}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Accuracy</p>
                  <p className="font-display text-2xl text-on-surface">{(results.modelSummary.accuracy * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Precision</p>
                  <p className="font-display text-2xl text-on-surface">{(results.modelSummary.precision * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">Recall</p>
                  <p className="font-display text-2xl text-on-surface">{(results.modelSummary.recall * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">F1 Score</p>
                  <p className="font-display text-2xl text-on-surface">{results.modelSummary.f1}</p>
                </div>
                {results.modelSummary.roc_auc != null && (
                  <div className="rounded-xl border border-primary/20 bg-surface-high/25 p-4">
                    <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] mb-1">ROC-AUC</p>
                    <p className="font-display text-2xl text-primary glow-text">{results.modelSummary.roc_auc}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Predictions Table & Filters */}
          <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-5">
            {/* Top Toolbar: Search + Risk Filters + Download */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                <input
                  type="text"
                  placeholder="Search by Customer ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-primary/20 bg-surface-low/80 text-sm text-on-surface font-mono placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Risk Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((riskBand) => {
                  const count =
                    riskBand === 'ALL'
                      ? results.customerResults.length
                      : results.customerResults.filter((r) => r.risk_level === riskBand).length;

                  const isSelected = filter === riskBand;
                  let activeBadgeClass = 'bg-primary/20 border-primary text-primary';
                  if (riskBand === 'HIGH' && isSelected) activeBadgeClass = 'bg-red-500/20 border-red-500 text-red-400';
                  if (riskBand === 'MEDIUM' && isSelected) activeBadgeClass = 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
                  if (riskBand === 'LOW' && isSelected) activeBadgeClass = 'bg-green-500/20 border-green-500 text-green-400';

                  return (
                    <button
                      key={riskBand}
                      type="button"
                      onClick={() => {
                        setFilter(riskBand);
                        setCurrentPage(1);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-[0.14em] transition-all border ${
                        isSelected
                          ? `${activeBadgeClass} shadow-[0_0_12px_rgba(34,211,238,0.2)]`
                          : 'border-primary/15 bg-surface-high/20 text-on-surface-variant hover:border-primary/30 hover:text-on-surface'
                      }`}
                    >
                      {riskBand} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Download CSV */}
              <button
                type="button"
                onClick={downloadCsv}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary font-mono text-xs uppercase tracking-[0.14em] hover:bg-primary hover:text-slate-950 transition-all duration-300 disabled:opacity-50"
              >
                <Download size={15} />
                {downloading ? 'Downloading...' : 'Download Results CSV'}
              </button>
            </div>

            {/* Results Count Summary */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
              <span>
                Showing {processedCustomerResults.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, processedCustomerResults.length)} of {processedCustomerResults.length} customers
              </span>
              <div className="flex items-center gap-2">
                <span>Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-surface-low rounded border border-primary/20 px-2 py-1 text-xs text-on-surface font-mono"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto rounded-xl border border-primary/15">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-primary/20 bg-surface-high/40 font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                    <th className="p-3.5">Customer ID</th>
                    <th className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('churn_probability')}
                        className="inline-flex items-center gap-1.5 hover:text-primary transition-colors ml-auto font-mono text-[11px]"
                      >
                        Churn Probability
                        {sortConfig.key === 'churn_probability' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />
                        ) : (
                          <ArrowUpDown size={13} className="opacity-50" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5 text-center">Risk Level</th>
                    <th className="p-3.5">Top Driver</th>
                    <th className="p-3.5">Recommended Action</th>
                    <th className="p-3.5 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {paginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant font-mono text-sm">
                        No customers found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedResults.map((row) => {
                      let riskBadgeClass = 'bg-green-500/15 border-green-500/30 text-green-400';
                      if (row.risk_level === 'HIGH') {
                        riskBadgeClass = 'bg-red-500/15 border-red-500/30 text-red-400';
                      } else if (row.risk_level === 'MEDIUM') {
                        riskBadgeClass = 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400';
                      }

                      return (
                        <tr
                          key={row.customer_id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="p-3.5 font-mono text-xs text-on-surface font-medium">
                            {row.customer_id}
                          </td>
                          <td className="p-3.5 text-right font-display text-sm font-bold text-on-surface">
                            <span className={row.risk_level === 'HIGH' ? 'text-red-400' : row.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}>
                              {row.churn_probability}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${riskBadgeClass}`}>
                              {row.risk_level}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs text-primary font-mono">
                            {row.top_driver || 'N/A'}
                          </td>
                          <td className="p-3.5 text-xs text-on-surface-variant max-w-xs truncate" title={row.recommended_action}>
                            {row.recommended_action}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-primary font-mono text-xs uppercase tracking-wider hover:bg-primary hover:text-slate-950 transition-all duration-200"
                            >
                              <Eye size={13} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/20 text-xs font-mono uppercase text-on-surface disabled:opacity-30 hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <span className="font-mono text-xs text-on-surface-variant">
                  Page <strong className="text-on-surface">{currentPage}</strong> of <strong className="text-on-surface">{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/20 text-xs font-mono uppercase text-on-surface disabled:opacity-30 hover:bg-white/5 transition-colors"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
