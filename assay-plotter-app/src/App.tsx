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
import { Upload, RefreshCcw, FileText, AlertCircle, Download } from 'lucide-react';
import { toPng } from 'html-to-image';

interface AssayDataPoint {
  concentration: number;
  [key: string]: number;
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5', '#ca8a04', '#0d9488', '#4338ca'];

const App: React.FC = () => {
  const [data, setData] = useState<AssayDataPoint[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [stdColumn, setStdColumn] = useState<string | null>(null);
  const [sampleColumns, setSampleColumns] = useState<string[]>([]);
  const [xColumn, setXColumn] = useState<string>('Mass (ug)');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
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
        if (results.data.length === 0) {
          setError('The CSV file appears to be empty.');
          return;
        }

        // Get all column names from the first row
        const firstRow = results.data[0] as any;
        const rawColumns = Object.keys(firstRow).map(k => k.trim());
        
        // Find X column (Concentration)
        const detectedX = rawColumns.find(c => 
          c.toLowerCase().includes('mass') || 
          c.toLowerCase().includes('conc') || 
          c.toLowerCase() === 'x'
        ) || rawColumns[0];

        // Find Standard column
        const detectedStd = rawColumns.find(c => 
          c !== detectedX && (
            c.toLowerCase().includes('std') || 
            c.toLowerCase().includes('standard') || 
            c.toLowerCase().includes('inhibition%')
          )
        );

        // All other columns are samples
        const detectedSamples = rawColumns.filter(c => 
          c !== detectedX && c !== detectedStd
        );

        setXColumn(detectedX);
        setStdColumn(detectedStd || null);
        setSampleColumns(detectedSamples);
        setColumns(rawColumns);

        const parsedData: AssayDataPoint[] = results.data
          .map((row: any) => {
            const cleanRow: any = {};
            const point: AssayDataPoint = { concentration: 0 };
            
            Object.keys(row).forEach((key) => {
              const trimmedKey = key.trim();
              const val = parseFloat(row[key]);
              if (!isNaN(val)) {
                if (trimmedKey === detectedX) {
                  point.concentration = val;
                } else {
                  point[trimmedKey] = val;
                }
              }
            });

            return point;
          })
          .filter((item) => !isNaN(item.concentration))
          .sort((a, b) => a.concentration - b.concentration);

        if (parsedData.length === 0) {
          setError(`No valid data points found. Ensure your CSV has a concentration column and numeric values.`);
        } else {
          setData(parsedData);
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleReset = () => {
    setData([]);
    setError(null);
    setFileName(null);
    setColumns([]);
    setStdColumn(null);
    setSampleColumns([]);
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
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Assay Results Analysis</h1>
          <p className="text-slate-500 mt-2 italic">General Dose-response visualization for any number of samples</p>
        </header>

        <main>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300 rounded-xl bg-white p-12 transition-all hover:border-blue-400 group">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-blue-600 w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Upload Assay Results</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Select a .csv file containing Concentration and Inhibition% columns for Standard and Samples.
              </p>
              
              <label className="cursor-pointer">
                <span className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-2">
                  <FileText size={18} />
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
                <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-md border border-red-100">
                  <AlertCircle size={18} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 p-2 rounded-md text-green-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800">{fileName}</h3>
                    <p className="text-xs text-slate-500">{data.length} data points, {sampleColumns.length + (stdColumn ? 1 : 0)} series</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleDownloadPlot}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md border border-blue-100"
                  >
                    <Download size={16} />
                    Download Plot (.png)
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-md border border-gray-200"
                  >
                    <RefreshCcw size={16} />
                    Upload New Data
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-100" ref={chartRef}>
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="concentration" 
                        type="number"
                        label={{ value: xColumn, position: 'insideBottom', offset: -45, style: { fontWeight: 600, fill: '#475569' } }}
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b' }}
                      />
                      <YAxis 
                        label={{ value: 'Inhibition (%)', angle: -90, position: 'insideLeft', offset: 0, style: { fontWeight: 600, fill: '#475569' } }}
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b' }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any, name: string) => [`${parseFloat(value).toFixed(2)}%`, name]}
                        labelFormatter={(label) => `${xColumn}: ${label}`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '30px' }}
                      />
                      
                      {/* Standard */}
                      {stdColumn && (
                        <Line 
                          type="monotone" 
                          dataKey={stdColumn} 
                          name={`Standard: ${stdColumn}`} 
                          stroke={COLORS[0]} 
                          strokeWidth={3}
                          dot={{ r: 6, fill: COLORS[0] }}
                          activeDot={{ r: 8 }}
                        />
                      )}
                      
                      {/* Samples */}
                      {sampleColumns.map((col, idx) => (
                        <Line 
                          key={col}
                          type="monotone" 
                          dataKey={col} 
                          name={`Sample: ${col}`} 
                          stroke={COLORS[(idx + 1) % COLORS.length]} 
                          strokeWidth={3}
                          dot={{ r: 6, fill: COLORS[(idx + 1) % COLORS.length], strokeWidth: 0 }}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-slate-800">Parsed Data Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white text-slate-500 font-medium">
                        <th className="px-6 py-3 border-b">{xColumn}</th>
                        {stdColumn && (
                          <th className="px-6 py-3 border-b" style={{ color: COLORS[0] }}>{stdColumn}</th>
                        )}
                        {sampleColumns.map((col, idx) => (
                          <th key={col} className="px-6 py-3 border-b" style={{ color: COLORS[(idx + 1) % COLORS.length] }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.map((point, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium">{point.concentration}</td>
                          {stdColumn && (
                            <td className="px-6 py-3">{point[stdColumn]?.toFixed(2)}%</td>
                          )}
                          {sampleColumns.map((col) => (
                            <td key={col} className="px-6 py-3">{point[col]?.toFixed(2)}%</td>
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

        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>&copy; 2026 AssayPlot Laboratory Tools. Academic Use Only.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
