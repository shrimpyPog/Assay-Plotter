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
  std: number;
  rce: number;
  cae: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<AssayDataPoint[]>([]);
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
        const parsedData: AssayDataPoint[] = results.data
          .map((row: any) => {
            // Clean keys (remove whitespace)
            const cleanRow: any = {};
            Object.keys(row).forEach((key) => {
              cleanRow[key.trim()] = row[key];
            });

            const x = parseFloat(cleanRow['Mass (ug)']);
            const std = parseFloat(cleanRow['Std Inhibition%']);
            const rce = parseFloat(cleanRow['RCE inhibition%']);
            const cae = parseFloat(cleanRow['CAE %inhibition']);

            if (isNaN(x) || isNaN(std) || isNaN(rce) || isNaN(cae)) {
              return null;
            }

            return {
              concentration: x,
              std,
              rce,
              cae,
            };
          })
          .filter((item): item is AssayDataPoint => item !== null)
          .sort((a, b) => a.concentration - b.concentration);

        if (parsedData.length === 0) {
          setError('No valid data points found. Check column headers: "Mass (ug)", "Std Inhibition%", "RCE inhibition%", "CAE %inhibition"');
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
          <p className="text-slate-500 mt-2 italic">Dose-response visualization for 96-well plate assays</p>
        </header>

        <main>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300 rounded-xl bg-white p-12 transition-all hover:border-blue-400 group">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-blue-600 w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Upload Assay Results</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Select a .csv file containing Mass (ug), Std Inhibition%, RCE inhibition%, and CAE %inhibition columns.
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
                    <p className="text-xs text-slate-500">{data.length} data points parsed successfully</p>
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
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="concentration" 
                        type="number"
                        label={{ value: 'Concentration (µg)', position: 'insideBottom', offset: -40, style: { fontWeight: 600, fill: '#475569' } }}
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b' }}
                      />
                      <YAxis 
                        label={{ value: '% Inhibition', angle: -90, position: 'insideLeft', offset: 0, style: { fontWeight: 600, fill: '#475569' } }}
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: '#64748b' }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`${parseFloat(value).toFixed(2)}%`, '']}
                        labelFormatter={(label) => `Concentration: ${label} µg`}
                      />
                      <Legend verticalAlign="top" height={40} />
                      
                      {/* Standard - Blue */}
                      <Line 
                        type="monotone" 
                        dataKey="std" 
                        name="Standard" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#2563eb' }}
                        activeDot={{ r: 8 }}
                      />
                      
                      {/* Sample RCE - Red */}
                      <Line 
                        type="monotone" 
                        dataKey="rce" 
                        name="Sample RCE" 
                        stroke="#dc2626" 
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#dc2626', strokeWidth: 0 }}
                        activeDot={{ r: 8 }}
                      />
                      
                      {/* Sample CAE - Green */}
                      <Line 
                        type="monotone" 
                        dataKey="cae" 
                        name="Sample CAE" 
                        stroke="#16a34a" 
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#16a34a' }}
                        activeDot={{ r: 8 }}
                      />
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
                        <th className="px-6 py-3 border-b">Concentration (µg)</th>
                        <th className="px-6 py-3 border-b text-blue-600">Std Inhibition%</th>
                        <th className="px-6 py-3 border-b text-red-600">RCE inhibition%</th>
                        <th className="px-6 py-3 border-b text-green-600">CAE %inhibition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.map((point, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium">{point.concentration}</td>
                          <td className="px-6 py-3">{point.std.toFixed(2)}%</td>
                          <td className="px-6 py-3">{point.rce.toFixed(2)}%</td>
                          <td className="px-6 py-3">{point.cae.toFixed(2)}%</td>
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
