import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Upload, RefreshCcw, FileText, AlertCircle, Download, Info } from 'lucide-react';
import { toPng } from 'html-to-image';

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#9333ea', 
  '#0891b2', '#db2777', '#4f46e5', '#ca8a04',
  '#f97316', '#065f46', '#be185d', '#4338ca'
];

const extractNumber = (str: string): number | null => {
  const match = str.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [xAxisKey, setXAxisKey] = useState<string>('concentration');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isHorizontal, setIsHorizontal] = useState<boolean>(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data as any[];
        if (rawData.length === 0) {
          setError('The uploaded CSV file appears to be empty.');
          return;
        }

        const headers = Object.keys(rawData[0]).map(h => h.trim());
        const cleanedData = rawData.map(row => {
          const newRow: any = {};
          Object.keys(row).forEach((key) => {
            newRow[key.trim()] = row[key];
          });
          return newRow;
        });

        const horizontalKey = headers.find(h => 
          ['compound', 'sample', 'name', 'id'].includes(h.toLowerCase())
        );

        let finalData: any[] = [];
        let finalSeries: string[] = [];
        let finalXKey = 'concentration';

        if (horizontalKey) {
          // Horizontal / Compound-based Format
          setIsHorizontal(true);
          const valueHeaders = headers.filter(h => h !== horizontalKey);
          const concentrationMap = new Map<number, any>();
          const seriesNames: string[] = [];

          cleanedData.forEach(row => {
            const sampleName = row[horizontalKey]?.toString().strip?.() || row[horizontalKey];
            if (!sampleName || sampleName === 'null') return;
            seriesNames.push(sampleName);

            valueHeaders.forEach(vh => {
              const conc = extractNumber(vh);
              if (conc === null) return;

              if (!concentrationMap.has(conc)) {
                concentrationMap.set(conc, { [finalXKey]: conc });
              }
              const val = parseFloat(row[vh]);
              if (!isNaN(val)) {
                concentrationMap.get(conc)[sampleName] = val;
              }
            });
          });

          finalData = Array.from(concentrationMap.values()).sort((a, b) => a[finalXKey] - b[finalXKey]);
          finalSeries = seriesNames;
        } else {
          // Vertical / Standard Format
          setIsHorizontal(false);
          finalXKey = headers.find(h => 
            ['mass (ug)', 'concentration', 'conc', 'x', 'mass'].includes(h.toLowerCase())
          ) || headers[0];

          finalSeries = headers.filter(h => h !== finalXKey);
          
          finalData = cleanedData.map(row => {
            const newRow: any = { ...row };
            newRow[finalXKey] = parseFloat(row[finalXKey]);
            finalSeries.forEach(s => {
              newRow[s] = parseFloat(row[s]);
            });
            return newRow;
          }).filter(row => !isNaN(row[finalXKey]))
            .sort((a, b) => a[finalXKey] - b[finalXKey]);
        }

        if (finalData.length === 0) {
          setError('No valid numerical data found in the CSV.');
        } else {
          setData(finalData);
          setSeries(finalSeries);
          setXAxisKey(finalXKey);
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleReset = () => {
    setData([]);
    setSeries([]);
    setError(null);
    setFileName(null);
  };

  const handleDownloadPlot = async () => {
    if (chartRef.current === null) return;
    
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', cacheBust: true });
      const link = document.createElement('a');
      link.download = `assay-plot-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download plot', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Assay Plotter Web</h1>
            <p className="text-slate-500 mt-1 italic">Professional dose-response curve visualization</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            <Info size={14} />
            Supports Vertical & Horizontal CSVs
          </div>
        </header>

        <main>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[450px] border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8 md:p-12 transition-all hover:border-blue-400 group shadow-sm">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload className="text-blue-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-slate-800">Upload Your Assay Data</h2>
              <div className="text-gray-500 text-center max-w-lg mb-10 space-y-2">
                <p>Drag and drop or select a CSV file to visualize your results.</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-medium">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Standard Vertical</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Compound-based</span>
                </div>
              </div>
              
              <label className="cursor-pointer">
                <span className="bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-lg inline-flex items-center gap-3 active:scale-95">
                  <FileText size={20} />
                  Select CSV File
                </span>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </label>

              {error && (
                <div className="mt-8 flex items-center gap-3 text-red-600 bg-red-50 px-6 py-3 rounded-xl border border-red-100 animate-in shake duration-300">
                  <AlertCircle size={20} />
                  <span className="text-sm font-semibold">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-blue-200 shadow-lg">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{fileName}</h3>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {isHorizontal ? 'Horizontal' : 'Vertical'} Format
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{data.length} steps • {series.length} series</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={handleDownloadPlot}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-blue-700 hover:text-white transition-all bg-white hover:bg-blue-600 px-5 py-2.5 rounded-xl border-2 border-blue-600 active:scale-95"
                  >
                    <Download size={18} />
                    Download PNG
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-xl active:scale-95"
                  >
                    <RefreshCcw size={18} />
                    Reset
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-gray-100" ref={chartRef}>
                <div className="h-[550px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey={xAxisKey} 
                        type="number"
                        label={{ value: `Concentration (${xAxisKey})`, position: 'insideBottom', offset: -45, style: { fontWeight: 700, fill: '#1e293b', fontSize: 14 } }}
                        stroke="#cbd5e1"
                        tick={{ fill: '#64748b', fontWeight: 500 }}
                        padding={{ left: 20, right: 20 }}
                      />
                      <YAxis 
                        label={{ value: '% Inhibition', angle: -90, position: 'insideLeft', offset: 0, style: { fontWeight: 700, fill: '#1e293b', fontSize: 14 } }}
                        domain={[0, 110]}
                        stroke="#cbd5e1"
                        tick={{ fill: '#64748b', fontWeight: 500 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                        itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                        labelStyle={{ fontWeight: 700, marginBottom: '4px', color: '#1e293b' }}
                        formatter={(value: any) => [`${parseFloat(value).toFixed(2)}%`, '']}
                        labelFormatter={(label) => `Conc: ${label}`}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={60} 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '0px', fontWeight: 600, color: '#334155' }}
                      />
                      
                      {series.map((s, idx) => (
                        <Line 
                          key={s}
                          type="monotone" 
                          dataKey={s} 
                          name={s} 
                          stroke={COLORS[idx % COLORS.length]} 
                          strokeWidth={3}
                          dot={{ r: 5, fill: COLORS[idx % COLORS.length], strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          animationDuration={1500}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table Summary */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Detailed Data Table</h3>
                  <span className="text-xs font-bold text-slate-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
                    Scroll horizontally if needed →
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-white text-slate-500 font-bold border-b border-gray-100">
                        <th className="px-8 py-4 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          {xAxisKey}
                        </th>
                        {series.map((s, idx) => (
                          <th key={s} className="px-8 py-4" style={{ color: COLORS[idx % COLORS.length] }}>
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.map((point, pIdx) => (
                        <tr key={pIdx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-700 sticky left-0 bg-white/80 backdrop-blur-sm shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            {point[xAxisKey]}
                          </td>
                          {series.map((s) => (
                            <td key={s} className="px-8 py-4 font-medium text-slate-600">
                              {typeof point[s] === 'number' ? `${point[s].toFixed(2)}%` : '—'}
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
        </main>

        <footer className="mt-16 pb-8 text-center text-slate-400 text-sm font-medium">
          <p>© 2026 AssayPlot Laboratory Tools • Open Source Scientific Visualization</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
