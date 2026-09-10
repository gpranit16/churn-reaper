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

const SAMPLE_TELCO_CSV = `customerID,gender,SeniorCitizen,Partner,Dependents,tenure,PhoneService,MultipleLines,InternetService,OnlineSecurity,OnlineBackup,DeviceProtection,TechSupport,StreamingTV,StreamingMovies,Contract,PaperlessBilling,PaymentMethod,MonthlyCharges,TotalCharges,Churn
7590-VHVEG,Female,0,Yes,No,1,No,No phone service,DSL,No,Yes,No,No,No,No,Month-to-month,Yes,Electronic check,29.85,29.85,No
5575-GNVDE,Male,0,No,No,34,Yes,No,DSL,Yes,No,Yes,No,No,No,One year,No,Mailed check,56.95,1889.5,No
3668-QPYBK,Male,0,No,No,2,Yes,No,DSL,Yes,Yes,No,No,No,No,Month-to-month,Yes,Mailed check,53.85,108.15,Yes
7795-CFOCW,Male,0,No,No,45,No,No phone service,DSL,Yes,No,Yes,Yes,No,No,One year,No,Bank transfer (automatic),42.3,1840.75,No
9237-HQITU,Female,0,No,No,2,Yes,No,Fiber optic,No,No,No,No,No,No,Month-to-month,Yes,Electronic check,70.7,151.65,Yes
9305-CDSKC,Female,0,No,No,8,Yes,Yes,Fiber optic,No,No,Yes,No,Yes,Yes,Month-to-month,Yes,Electronic check,99.65,820.5,Yes
1452-KIOVK,Male,0,No,Yes,22,Yes,Yes,Fiber optic,No,Yes,No,No,Yes,No,Month-to-month,Yes,Credit card (automatic),89.1,1949.4,No
6713-OKOMC,Female,0,No,No,10,No,No phone service,DSL,Yes,No,No,No,No,No,Month-to-month,No,Mailed check,29.75,301.9,No
7892-POOKP,Female,0,Yes,No,28,Yes,Yes,Fiber optic,No,No,Yes,Yes,Yes,Yes,Month-to-month,Yes,Electronic check,104.8,3046.05,Yes
6388-TABGU,Male,0,No,Yes,62,Yes,No,DSL,Yes,Yes,No,No,No,No,One year,No,Bank transfer (automatic),56.15,3487.95,No
9763-GRSKD,Male,0,Yes,Yes,13,Yes,No,DSL,Yes,No,No,No,No,No,Month-to-month,Yes,Mailed check,49.95,587.45,No
7469-LKBCI,Male,0,No,No,16,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Two year,No,Credit card (automatic),18.95,326.8,No
8091-TTVAX,Male,0,Yes,No,58,Yes,Yes,Fiber optic,No,No,Yes,No,Yes,Yes,One year,No,Credit card (automatic),100.35,5681.1,No
0280-XJGEX,Male,0,No,No,49,Yes,Yes,Fiber optic,No,Yes,Yes,No,Yes,Yes,Month-to-month,Yes,Bank transfer (automatic),103.7,5036.3,Yes
5129-JLPIS,Male,0,No,No,25,Yes,No,Fiber optic,Yes,No,Yes,Yes,Yes,Yes,Month-to-month,Yes,Electronic check,105.5,2686.05,No
3655-SNQYZ,Female,0,Yes,Yes,69,Yes,Yes,Fiber optic,Yes,Yes,Yes,Yes,Yes,Yes,Two year,No,Credit card (automatic),113.25,7895.15,No
8191-XWSZG,Female,0,No,No,52,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,One year,No,Mailed check,20.65,1022.95,No
9959-WOFKT,Male,0,No,Yes,71,Yes,Yes,Fiber optic,Yes,No,Yes,No,Yes,Yes,Two year,No,Bank transfer (automatic),106.7,7382.25,No
4190-MFLUW,Female,0,Yes,Yes,10,Yes,No,DSL,No,No,Yes,Yes,No,No,Month-to-month,No,Credit card (automatic),55.2,528.35,Yes
4183-MYFRB,Female,0,No,No,21,Yes,No,Fiber optic,No,Yes,Yes,No,No,Yes,Month-to-month,Yes,Electronic check,90.05,1862.9,No
8779-QRDMV,Male,1,No,No,1,No,No phone service,DSL,No,No,Yes,No,No,Yes,Month-to-month,Yes,Electronic check,39.65,39.65,Yes
1680-VDCWW,Male,0,Yes,No,12,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,One year,No,Bank transfer (automatic),19.8,202.25,No
1066-JKSGK,Male,0,No,No,1,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Month-to-month,No,Mailed check,20.15,20.15,Yes
3638-WEABW,Female,0,Yes,No,58,Yes,Yes,DSL,No,Yes,No,Yes,No,No,Two year,Yes,Credit card (automatic),59.9,3505.1,No
6322-HRPFA,Male,0,Yes,Yes,49,Yes,No,DSL,Yes,Yes,No,Yes,No,No,Month-to-month,No,Credit card (automatic),59.6,2970.3,No
6865-JZNKO,Female,0,No,No,30,Yes,No,DSL,Yes,Yes,No,No,No,No,Month-to-month,Yes,Bank transfer (automatic),55.3,1530.6,No
6467-CHFZW,Male,0,Yes,Yes,47,Yes,Yes,Fiber optic,No,Yes,No,No,Yes,Yes,Month-to-month,Yes,Electronic check,99.35,4749.15,Yes
8665-UTDHZ,Male,0,Yes,Yes,1,No,No phone service,DSL,No,Yes,No,No,No,No,Month-to-month,No,Electronic check,30.2,30.2,Yes
5248-YGIJN,Male,0,Yes,No,72,Yes,Yes,DSL,Yes,Yes,Yes,Yes,Yes,Yes,Two year,Yes,Credit card (automatic),90.25,6369.45,No
8773-HHUOZ,Female,0,No,Yes,17,Yes,No,DSL,No,No,No,No,Yes,Yes,Month-to-month,Yes,Mailed check,64.7,1093.1,Yes
3841-NFECX,Female,1,Yes,No,71,Yes,Yes,Fiber optic,Yes,Yes,Yes,Yes,No,No,Two year,Yes,Credit card (automatic),96.35,6766.95,No
4929-XIHVW,Male,1,Yes,No,2,Yes,No,Fiber optic,No,No,Yes,No,Yes,Yes,Month-to-month,Yes,Credit card (automatic),95.5,181.65,No
6827-IEAUQ,Female,0,Yes,Yes,27,Yes,No,DSL,Yes,Yes,Yes,Yes,No,No,One year,No,Mailed check,66.15,1874.45,No
7310-EGVHZ,Male,0,No,No,1,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Month-to-month,No,Bank transfer (automatic),20.2,20.2,No
3413-BMNZE,Male,1,No,No,1,Yes,No,DSL,No,No,No,No,No,No,Month-to-month,No,Bank transfer (automatic),45.25,45.25,No
6234-RAAPL,Female,0,Yes,Yes,72,Yes,Yes,Fiber optic,Yes,Yes,No,Yes,Yes,No,Two year,No,Bank transfer (automatic),99.9,7251.7,No
6047-YHPVI,Male,0,No,No,5,Yes,No,Fiber optic,No,No,No,No,No,No,Month-to-month,Yes,Electronic check,69.7,316.9,Yes
6572-ADKRS,Female,0,No,No,46,Yes,No,Fiber optic,No,No,Yes,No,No,No,Month-to-month,Yes,Credit card (automatic),74.8,3548.3,No
5380-WJKOV,Male,0,No,No,34,Yes,Yes,Fiber optic,No,Yes,Yes,No,Yes,Yes,Month-to-month,Yes,Electronic check,106.35,3549.25,Yes
8168-UQWWF,Female,0,No,No,11,Yes,Yes,Fiber optic,No,No,Yes,No,Yes,Yes,Month-to-month,Yes,Bank transfer (automatic),97.85,1105.4,Yes
8865-TNMNX,Male,0,Yes,Yes,10,Yes,No,DSL,No,Yes,No,No,No,No,One year,No,Mailed check,49.55,475.7,No
9489-DEDVP,Female,0,Yes,Yes,70,Yes,Yes,DSL,Yes,Yes,No,No,Yes,No,Two year,Yes,Credit card (automatic),69.2,4872.35,No
9867-JCZSP,Female,0,Yes,Yes,17,Yes,No,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,One year,No,Mailed check,20.75,418.25,No
4671-VJLCL,Female,0,No,No,63,Yes,Yes,DSL,Yes,Yes,Yes,Yes,Yes,No,Two year,Yes,Credit card (automatic),79.85,4861.45,No
4080-IIARD,Female,0,Yes,No,13,Yes,Yes,DSL,Yes,Yes,No,Yes,Yes,No,Month-to-month,Yes,Electronic check,76.2,981.45,No
3714-NTNFO,Female,0,No,No,49,Yes,Yes,Fiber optic,No,No,No,No,No,Yes,Month-to-month,Yes,Electronic check,84.5,3906.7,No
5948-UJZLF,Male,0,No,No,2,Yes,No,DSL,No,Yes,No,No,No,No,Month-to-month,No,Mailed check,49.25,97,No
7760-OYPDY,Female,0,No,No,2,Yes,No,Fiber optic,No,No,No,No,Yes,No,Month-to-month,Yes,Electronic check,80.65,144.15,Yes
7639-LIAYI,Male,0,No,No,52,Yes,Yes,DSL,Yes,No,No,Yes,Yes,Yes,Two year,Yes,Credit card (automatic),79.75,4217.8,No
2954-PIBKO,Female,0,Yes,Yes,69,Yes,Yes,DSL,Yes,No,Yes,Yes,No,No,Two year,Yes,Credit card (automatic),64.15,4254.1,No
8012-SOUDQ,Female,1,No,No,43,Yes,Yes,Fiber optic,No,Yes,No,No,Yes,No,Month-to-month,Yes,Electronic check,90.25,3838.75,No
9420-LOJKX,Female,0,No,No,15,Yes,No,Fiber optic,Yes,Yes,No,No,Yes,Yes,Month-to-month,Yes,Credit card (automatic),99.1,1426.4,Yes
6575-SUVOI,Female,1,Yes,No,25,Yes,Yes,DSL,Yes,No,No,Yes,Yes,No,Month-to-month,Yes,Credit card (automatic),69.5,1752.65,No
7495-OOKFY,Female,1,Yes,No,8,Yes,Yes,Fiber optic,No,Yes,No,No,No,No,Month-to-month,Yes,Credit card (automatic),80.65,633.3,Yes
4667-QONEA,Female,1,Yes,Yes,60,Yes,No,DSL,Yes,Yes,Yes,Yes,No,Yes,One year,Yes,Credit card (automatic),74.85,4456.35,No
1658-BYGOY,Male,1,No,No,18,Yes,Yes,Fiber optic,No,No,No,No,Yes,Yes,Month-to-month,Yes,Electronic check,95.45,1752.55,Yes
8769-KKTPH,Female,0,Yes,Yes,63,Yes,Yes,Fiber optic,Yes,No,No,No,Yes,Yes,One year,Yes,Credit card (automatic),99.65,6311.2,No
5067-XJQFU,Male,1,Yes,Yes,66,Yes,Yes,Fiber optic,No,Yes,Yes,Yes,Yes,Yes,One year,Yes,Electronic check,108.45,7076.35,No
3957-SQXML,Female,0,Yes,Yes,34,Yes,Yes,No,No internet service,No internet service,No internet service,No internet service,No internet service,No internet service,Two year,No,Credit card (automatic),24.95,894.3,No`;

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

  const handleLoadDemoBenchmark = () => {
    setErrorMessage('');
    processUploadedCSV(SAMPLE_TELCO_CSV, 'telco_churn_benchmark.csv', SAMPLE_TELCO_CSV.length);
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
      setErrorMessage('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <header className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 shadow-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-light">
              Cohort Intelligence Studio
            </span>
            <span className="text-white/[0.2] text-xs">/</span>
            <span className="text-xs text-on-surface-muted">Batch Model Training &amp; Scoring</span>
          </div>
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dataset Churn Analysis &amp; Inference Ledger
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Upload CSV cohort data, train an isolated XGBoost model, score every customer row, and inspect individual risk profiles.
          </p>
        </div>
        {step !== 'upload' && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.1] bg-surface-low text-xs font-mono text-on-surface-variant hover:text-white hover:bg-surface-high transition-colors"
          >
            <Upload size={13} />
            Upload Different CSV
          </button>
        )}
      </header>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3 text-xs font-mono text-red-400">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <div>
            <p className="font-semibold uppercase">Processing Error</p>
            <p className="font-sans text-on-surface mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 gap-6">
          <GlassCard paddingClass="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
              <div className="h-12 w-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-light">
                <Upload size={22} />
              </div>
              <div>
                <h3 className="font-sans text-lg font-bold text-white">Upload Customer CSV Dataset</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Upload customer CSV file (e.g. Telco churn benchmark with 7,043 rows). The platform will automatically inspect schema, map features, train XGBoost, and generate risk scores.
                </p>
              </div>

              <label className="w-full cursor-pointer group">
                <div className="border border-dashed border-white/[0.15] group-hover:border-brand-light/50 rounded-xl p-8 transition-colors bg-surface-low/80 group-hover:bg-surface-low">
                  <FileText className="mx-auto text-on-surface-muted group-hover:text-brand-light mb-2.5 transition-colors" size={28} />
                  <span className="block font-medium text-xs sm:text-sm text-on-surface">Click to select or drag CSV file here</span>
                  <span className="block font-mono text-[11px] text-on-surface-muted mt-1">UTF-8 .CSV files supported</span>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-3 w-full">
                <div className="h-px bg-white/[0.08] flex-1" />
                <span className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider">OR QUICK START</span>
                <div className="h-px bg-white/[0.08] flex-1" />
              </div>

              <button
                type="button"
                onClick={handleLoadDemoBenchmark}
                className="w-full py-3 px-4 rounded-lg border border-brand/40 bg-brand/15 text-brand-light font-semibold text-xs hover:bg-brand hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Sparkles size={14} />
                <span>Load Benchmark Telco Dataset (Demo)</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* STEP 2: PREVIEW & COLUMN CONFIRMATION */}
      {step === 'preview' && fileInfo && (
        <div className="space-y-6">
          {/* File Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel">
              <p className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider mb-1">File Name</p>
              <p className="font-sans text-sm font-semibold text-white truncate" title={fileInfo.name}>{fileInfo.name}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel">
              <p className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider mb-1">Total Rows</p>
              <p className="font-mono text-xl font-bold text-white tabular-numbers">{fileInfo.rowCount.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel">
              <p className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider mb-1">Columns</p>
              <p className="font-mono text-xl font-bold text-brand-light tabular-numbers">{fileInfo.columnCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-white/[0.08] shadow-panel">
              <p className="font-mono text-[10px] text-on-surface-muted uppercase tracking-wider mb-1">Missing Values</p>
              <p className="font-mono text-xl font-bold text-white tabular-numbers">
                {Object.values(missingSummary).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>

          {/* Column Configuration Card */}
          <GlassCard paddingClass="p-5 sm:p-6" className="space-y-5">
            <div className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="text-brand-light" size={16} />
                <h3 className="font-sans text-base font-semibold text-white tracking-tight">Schema Confirmation &amp; Target Setup</h3>
              </div>
              <p className="text-xs text-on-surface-muted mt-0.5">
                Review automatically detected target column and ID identifiers before starting training.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Target Column Selector */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-brand-light">
                  Target / Churn Column *
                </label>
                <select
                  value={confirmedColumns.targetColumn}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-surface-low px-3 py-2 text-xs text-on-surface font-mono focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                >
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col} {col === columnDetection.target ? '(Detected Target)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer ID Column Selector */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Customer ID Column (Optional)
                </label>
                <select
                  value={confirmedColumns.customerIdColumn}
                  onChange={(e) => setConfirmedColumns((prev) => ({ ...prev, customerIdColumn: e.target.value }))}
                  className="w-full rounded-lg border border-white/[0.1] bg-surface-low px-3 py-2 text-xs text-on-surface font-mono focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
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
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                  Positive Churn Class
                </label>
                {columnDetection.targetClasses.length > 0 ? (
                  <select
                    value={confirmedColumns.positiveClass}
                    onChange={(e) => setConfirmedColumns((prev) => ({ ...prev, positiveClass: e.target.value }))}
                    className="w-full rounded-lg border border-white/[0.1] bg-surface-low px-3 py-2 text-xs text-on-surface font-mono focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
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
                    className="w-full rounded-lg border border-white/[0.1] bg-surface-low px-3 py-2 text-xs text-on-surface font-mono focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                  />
                )}
              </div>
            </div>

            {/* Detected Feature Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-surface-low border border-white/[0.06]">
                <p className="font-mono text-[10px] text-brand-light uppercase tracking-wider mb-1 font-semibold">
                  Numeric Features ({columnDetection.numeric.length})
                </p>
                <p className="font-mono text-xs text-on-surface-muted truncate">
                  {columnDetection.numeric.join(', ') || 'None'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-low border border-white/[0.06]">
                <p className="font-mono text-[10px] text-brand-light uppercase tracking-wider mb-1 font-semibold">
                  Categorical Features ({columnDetection.categorical.length})
                </p>
                <p className="font-mono text-xs text-on-surface-muted truncate">
                  {columnDetection.categorical.join(', ') || 'None'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleTrain}
                className="px-6 py-3.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:via-teal-500 hover:to-cyan-500 text-white font-bold text-sm tracking-wide shadow-[0_4px_20px_rgba(16,185,129,0.4)] border border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Sparkles size={16} className="text-emerald-200" />
                <span>Train Model &amp; Score All Customers</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-lg border border-white/[0.1] bg-surface-low text-on-surface-variant text-xs hover:text-white hover:bg-surface-high transition-colors cursor-pointer"
              >
                <Upload size={14} />
                Change CSV File
              </button>
            </div>
          </GlassCard>

          {/* Dataset Preview Table */}
          <div className="rounded-xl border border-white/[0.08] bg-surface p-5 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-on-surface-muted">
              Sample Preview (First 5 Rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-surface-low font-mono text-[11px] uppercase tracking-wider text-on-surface-muted">
                    {previewHeaders.map((h) => (
                      <th key={h} className="p-2.5 whitespace-nowrap font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02]">
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
        <GlassCard paddingClass="p-12">
          <div className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
            <div className="h-10 w-10 rounded-full border-2 border-brand-light/30 border-t-brand-light animate-spin" />
            <div>
              <h3 className="font-sans text-base font-bold text-white">Training XGBoost Classifier...</h3>
              <p className="text-xs text-on-surface-muted mt-1 leading-relaxed">
                {training.message || 'Executing stratified train/test split, regularized gradient boosting, and batch customer scoring...'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTraining({ isTraining: false, message: '' });
                setStep(csvContent ? 'preview' : 'upload');
              }}
              className="mt-2 px-4 py-1.5 rounded-lg border border-white/[0.1] bg-surface-low text-xs font-mono text-on-surface-variant hover:text-white hover:bg-surface-high transition-colors"
            >
              Cancel Training
            </button>
          </div>
        </GlassCard>
      )}

      {/* STEP 4: RESULTS */}
      {step === 'results' && results && (
        <div className="space-y-6">
          {/* Dataset & Model Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.datasetSummary && (
              <div className="p-5 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-3">
                <span className="font-mono text-[11px] font-semibold text-brand-light uppercase tracking-wider block">
                  Cohort Summary
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Scored Rows</span>
                    <span className="font-mono text-lg font-bold text-white tabular-numbers">{results.datasetSummary.rows.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Features</span>
                    <span className="font-mono text-lg font-bold text-white tabular-numbers">{results.datasetSummary.features}</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Churn Rate</span>
                    <span className="font-mono text-lg font-bold text-red-400 tabular-numbers">{results.datasetSummary.churn_rate}%</span>
                  </div>
                </div>
              </div>
            )}

            {results.modelSummary && (
              <div className="p-5 rounded-xl bg-surface border border-white/[0.08] shadow-panel space-y-3">
                <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Model Performance (Test Split)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Accuracy</span>
                    <span className="font-mono text-base font-bold text-white tabular-numbers">{(results.modelSummary.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Precision</span>
                    <span className="font-mono text-base font-bold text-white tabular-numbers">{(results.modelSummary.precision * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] text-on-surface-muted uppercase">Recall</span>
                    <span className="font-mono text-base font-bold text-white tabular-numbers">{(results.modelSummary.recall * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] text-brand-light uppercase">ROC-AUC</span>
                    <span className="font-mono text-base font-bold text-brand-light tabular-numbers">{results.modelSummary.roc_auc ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Predictions Table & Filters */}
          <div className="rounded-xl border border-white/[0.08] bg-surface p-5 sm:p-6 space-y-4 shadow-panel">
            {/* Top Toolbar: Search + Risk Filters + Download */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search customer ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-white/[0.1] bg-surface-low text-xs text-on-surface font-mono placeholder:text-on-surface-muted focus:border-brand-light focus:outline-none focus:ring-1 focus:ring-brand-light/30"
                />
              </div>

              {/* Risk Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((riskBand) => {
                  const count =
                    riskBand === 'ALL'
                      ? results.customerResults.length
                      : results.customerResults.filter((r) => r.risk_level === riskBand).length;

                  const isSelected = filter === riskBand;

                  const riskClass = isSelected
                    ? riskBand === 'HIGH'
                      ? 'bg-red-500/15 border-red-500/40 text-red-400 font-bold'
                      : riskBand === 'MEDIUM'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold'
                      : riskBand === 'LOW'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-white/[0.1] border-white/[0.2] text-white font-bold'
                    : 'border-white/[0.06] bg-surface-low text-on-surface-muted hover:text-white hover:bg-surface-high';

                  return (
                    <button
                      key={riskBand}
                      type="button"
                      onClick={() => {
                        setFilter(riskBand);
                        setCurrentPage(1);
                      }}
                      className={'px-3 py-1 rounded-md text-xs font-mono uppercase tracking-wider transition-colors border ' + riskClass}
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand/40 bg-brand/15 text-brand-light font-mono text-xs hover:bg-brand hover:text-white transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                {downloading ? 'Exporting...' : 'Export Results CSV'}
              </button>
            </div>

            {/* Results Count Summary */}
            <div className="flex items-center justify-between text-[11px] text-on-surface-muted font-mono">
              <span>
                Showing {processedCustomerResults.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, processedCustomerResults.length)} of {processedCustomerResults.length} records
              </span>
              <div className="flex items-center gap-1.5">
                <span>Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-surface-low rounded border border-white/[0.1] px-2 py-0.5 text-[11px] text-on-surface font-mono"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-surface-low font-mono text-[11px] uppercase tracking-wider text-on-surface-muted">
                    <th className="p-3 font-medium">Customer ID</th>
                    <th className="p-3 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('churn_probability')}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors ml-auto font-mono text-[11px]"
                      >
                        Churn Risk
                        {sortConfig.key === 'churn_probability' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-brand-light" /> : <ArrowDown size={12} className="text-brand-light" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 text-center font-medium">Risk Level</th>
                    <th className="p-3 font-medium">Primary Risk Factor</th>
                    <th className="p-3 font-medium">Retention Recommendation</th>
                    <th className="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-on-surface-muted font-mono text-xs">
                        No customers matched current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedResults.map((row) => {
                      let riskBadgeClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                      if (row.risk_level === 'HIGH') {
                        riskBadgeClass = 'bg-red-500/10 border-red-500/30 text-red-400';
                      } else if (row.risk_level === 'MEDIUM') {
                        riskBadgeClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                      }

                      return (
                        <tr
                          key={row.customer_id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-3 font-mono text-xs text-white font-medium">
                            {row.customer_id}
                          </td>
                          <td className="p-3 text-right font-mono text-xs font-bold tabular-numbers">
                            <span className={row.risk_level === 'HIGH' ? 'text-red-400' : row.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}>
                              {row.churn_probability}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={'inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ' + riskBadgeClass}>
                              {row.risk_level}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-on-surface-variant font-mono">
                            {row.top_driver || 'N/A'}
                          </td>
                          <td className="p-3 text-xs text-on-surface-variant max-w-xs truncate" title={row.recommended_action}>
                            {row.recommended_action}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-brand/30 bg-brand/10 text-brand-light font-mono text-[11px] uppercase tracking-wider hover:bg-brand hover:text-white transition-colors"
                            >
                              <Eye size={12} />
                              Inspect
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-surface-low text-xs font-mono text-on-surface-variant disabled:opacity-30 hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="font-mono text-xs text-on-surface-muted">
                  Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-surface-low text-xs font-mono text-on-surface-variant disabled:opacity-30 hover:text-white transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
