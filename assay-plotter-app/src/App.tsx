import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import { Upload, RefreshCcw, FileText, AlertCircle, Download, Info } from 'lucide-react';
import { toPng } from 'html-to-image';

interface AssayDataPoint {
  concentration: number;
  [key: string]: number;
}

interface IC50Result {
  label: string;
  value: number | null;
  color: string;
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5', '#ca8a04', '#0d9488', '#4338ca'];

// --- Math Utilities for Curve Fitting (Natural Cubic Spline) ---

function solveTridiagonal(a: number[], b: number[], c: number[], d: number[]): number[] {
  const n = d.length;
  const cPrime = new Array(n);
  const dPrime = new Array(n);
  const x = new Array(n);

  cPrime[0] = c[0] / b[0];
  dPrime[0] = d[0] / b[0];

  for (let i = 1; i < n; i++) {
    const m = 1 / (b[i] - a[i] * cPrime[i - 1]);
    cPrime[i] = c[i] * m;
    dPrime[i] = (d[i] - a[i] * dPrime[i - 1]) * m;
  }

  x[n - 1] = dPrime[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    x[i] = dPrime[i] - cPrime[i] * x[i + 1];
  }

  return x;
}

function createCubicSpline(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return (val: number) => (n === 1 ? y[0] : 0);
  
  const h = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];

  if (n === 2) {
    return (val: number) => {
      const t = (val - x[0]) / h[0];
      return y[0] + t * (y[1] - y[0]);
    };
  }

  const a = new Array(n - 2);
  const b = new Array(n - 2);
  const c = new Array(n - 2);
  const d = new Array(n - 2);

  for (let i = 0; i < n - 2; i++) {
    a[i] = h[i];
    b[i] = 2 * (h[i] + h[i + 1]);
    c[i] = h[i + 1];
    d[i] = 6 * ((y[i + 2] - y[i + 1]) / h[i + 1] - (y[i + 1] - y[i]) / h[i]);
  }

  const M = [0, ...solveTridiagonal(a, b, c, d), 0];

  return (val: number) => {
    let low = 0, high = n - 2;
    let i = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (val >= x[mid] && val <= x[mid + 1]) {
        i = mid;
        break;
      }
      if (val < x[mid]) high = mid - 1;
      else low = mid + 1;
    }
    if (val > x[n-1]) i = n - 2;
    if (val < x[0]) i = 0;

    const deltaX = x[i + 1] - x[i];
    const A = (x[i + 1] - val) / deltaX;
    const B = (val - x[i]) / deltaX;
    const C = (1 / 6) * (A * A * A - A) * deltaX * deltaX;
    const D = (1 / 6) * (B * B * B - B) * deltaX * deltaX;

    return A * y[i] + B * y[i + 1] + C * M[i] + D * M[i + 1];
  };
}

// --- Main Component ---

const App: React.FC = () => {
  const [data, setData] = useState<AssayDataPoint[]>([]);
  const [stdColumn, setStdColumn] = useState<string | null>(null);
  const [sampleColumns, setSampleColumns] = useState<string[]>([]);
  const [xColumn, setXColumn] = useState<string>('Mass (ug)');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Memoized High-Resolution Data and IC50 Calculation
  const { interpolatedData, ic50Results } = useMemo(() => {
    if (data.length < 2) return { interpolatedData: [], ic50Results: [] };

    const minX = Math.min(...data.map(d => d.concentration));
    const maxX = Math.max(...data.map(d => d.concentration));
    const step = (maxX - minX) / 199;
    
    const allSeries = [stdColumn, ...sampleColumns].filter((c): c is string => !!c);
    const splines: Record<string, (v: number) => number> = {};
    
    allSeries.forEach(col => {
      const x = data.map(d => d.concentration);
      const y = data.map(d => d[col] || 0);
      splines[col] = createCubicSpline(x, y);
    });

    const highRes: any[] = [];
    for (let i = 0; i <= 199; i++) {
      const x = minX + i * step;
      const point: any = { concentration: x };
      allSeries.forEach(col => {
        point[col] = Math.max(0, Math.min(100, splines[col](x)));
      });
      highRes.push(point);
    }

    const results: IC50Result[] = allSeries.map((col, idx) => {
      let ic50: number | null = null;
      for (let i = 0; i < highRes.length - 1; i++) {
        const v1 = highRes[i][col];
        const v2 = highRes[i+1][col];
        if ((v1 <= 50 && v2 >= 50) || (v1 >= 50 && v2 <= 50)) {
          const t = (50 - v1) / (v2 - v1);
          ic50 = highRes[i].concentration + t * (highRes[i+1].concentration - highRes[i].concentration);
          break;
        }
      }
      return {
        label: col,
        value: ic50,
        color: COLORS[idx % COLORS.length]
      };
    });

    return { interpolatedData: highRes, ic50Results: results };
  }, [data, stdColumn, sampleColumns]);

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

        const firstRow = results.data[0] as any;
        const rawColumns = Object.keys(firstRow).map(k => k.trim());
        
        const detectedX = rawColumns.find(c => 
          c.toLowerCase().includes('mass') || 
          c.toLowerCase().includes('conc') || 
          c.toLowerCase() === 'x'
        ) || rawColumns[0];

        const detectedStd = rawColumns.find(c => 
          c !== detectedX && (
            c.toLowerCase().includes('std') || 
            c.toLowerCase().includes('standard')
          )
        );

        const detectedSamples = rawColumns.filter(c => 
          c !== detectedX && c !== detectedStd && !c.toLowerCase().includes('inhibition%')
        );

        setXColumn(detectedX);
        setStdColumn(detectedStd || null);
        setSampleColumns(detectedSamples);

        const parsedData: AssayDataPoint[] = results.data
          .map((row: any) => {
            const point: AssayDataPoint = { concentration: 0 };
            Object.keys(row).forEach((key) => {
              const trimmedKey = key.trim();
              const val = parseFloat(row[key]);
              if (!isNaN(val)) {
                if (trimmedKey === detectedX) point.concentration = val;
                else point[trimmedKey] = val;
              }
            });
            return point;
          })
          .filter((item) => !isNaN(item.concentration))
          .sort((a, b) => a.concentration - b.concentration);

        if (parsedData.length < 2) {
          setError(`At least 2 data points are required for mathematical curve fitting.`);
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
    setStdColumn(null);
    setSampleColumns([]);
  };

  const handleDownloadPlot = async () => {
    if (chartRef.current === null) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', cacheBust: true });
      const link = document.createElement('a');
      link.download = `assay-analysis-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export plot', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Assay Analysis Suite</h1>
          <p className="text-slate-500 mt-2 italic">High-resolution curve fitting & IC50 determination for plate assays</p>
        </header>

        <main>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-300 rounded-2xl bg-white p-12 transition-all hover:border-blue-400 group shadow-sm">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-blue-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Upload Lab Data</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Upload your CSV containing concentration series and % inhibition/activity values for automated analysis.
              </p>
              <label className="cursor-pointer">
                <span className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 inline-flex items-center gap-2">
                  <FileText size={20} />
                  Choose CSV File
                </span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              {error && (
                <div className="mt-8 flex items-center gap-3 text-red-600 bg-red-50 px-6 py-3 rounded-lg border border-red-100 animate-bounce">
                  <AlertCircle size={20} />
                  <span className="font-semibold">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg text-white shadow-md shadow-blue-100">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{fileName}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{data.length} data points</span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">High-res fitted curve</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleDownloadPlot} className="flex items-center gap-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all px-5 py-2.5 rounded-lg shadow-sm">
                    <Download size={18} />
                    Export Plot
                  </button>
                  <button onClick={handleReset} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all bg-white hover:bg-gray-50 px-5 py-2.5 rounded-lg border border-gray-200">
                    <RefreshCcw size={18} />
                    New Data
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-100" ref={chartRef}>
                <div className="h-[650px] w-full cursor-crosshair">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={interpolatedData} margin={{ top: 20, right: 40, left: 10, bottom: 100 }}>
                      <defs>
                        {ic50Results.map((res, idx) => (
                          <linearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={res.color} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={res.color} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="concentration" 
                        type="number"
                        domain={['auto', 'auto']}
                        label={{ value: `Concentration (${xColumn}) µg`, position: 'insideBottom', offset: -50, style: { fontWeight: 700, fill: '#1e293b', fontSize: 14 } }}
                        stroke="#cbd5e1"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'Inhibition / Activity (%)', angle: -90, position: 'insideLeft', offset: 15, style: { fontWeight: 700, fill: '#1e293b', fontSize: 14 } }}
                        domain={[0, 105]}
                        stroke="#cbd5e1"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '12px 16px' }}
                        itemStyle={{ fontWeight: 600 }}
                        labelStyle={{ fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}
                        formatter={(value: any, name: string) => [`${parseFloat(value).toFixed(2)}%`, name]}
                        labelFormatter={(label) => `Concentration: ${parseFloat(label).toFixed(2)} µg`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        height={60}
                        iconType="circle" 
                        wrapperStyle={{ paddingTop: '50px', bottom: '0' }}
                        formatter={(value) => <span className="text-slate-700 font-bold ml-1">{value}</span>}
                      />
                      
                      <ReferenceLine 
                        y={50} 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="8 4" 
                        label={{ value: '50% Threshold', position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 700 }} 
                      />

                      {ic50Results.map((res, idx) => res.value && (
                        <ReferenceLine 
                          key={`ic50-${idx}`}
                          x={res.value} 
                          stroke={res.color} 
                          strokeWidth={2}
                          strokeDasharray="4 4" 
                        />
                      ))}

                      {[stdColumn, ...sampleColumns].filter(Boolean).map((col, idx) => (
                        <Line 
                          key={`line-${col}`}
                          type="monotone"
                          dataKey={col!}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={4}
                          dot={false}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          name={col!}
                          animationDuration={1500}
                        />
                      ))}

                      {[stdColumn, ...sampleColumns].filter(Boolean).map((col, idx) => (
                        <Scatter 
                          key={`raw-${col}`}
                          data={data}
                          fill={COLORS[idx % COLORS.length]}
                          dataKey={col!}
                          name={`${col} (Observed)`}
                          legendType="none"
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ic50Results.map((res, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-110 transition-transform" style={{ backgroundColor: res.color }}></div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${res.color}15`, color: res.color }}>
                        <Info size={22} />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest text-slate-400">{res.label}</span>
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-800">
                        {res.value ? `${res.value.toFixed(2)} µg` : <span className="text-slate-300">N/A</span>}
                      </h4>
                      <p className="text-sm text-slate-500 font-medium mt-1">Determined IC₅₀ Concentration</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Experimental Observations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white text-slate-400 font-bold uppercase tracking-wider text-xs">
                        <th className="px-8 py-4 border-b">Conc. ({xColumn})</th>
                        {ic50Results.map((res, idx) => (
                          <th key={idx} className="px-8 py-4 border-b" style={{ color: res.color }}>{res.label} (%)</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.map((point, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-700">{point.concentration.toFixed(2)}</td>
                          {ic50Results.map((res, ridx) => (
                            <td key={ridx} className="px-8 py-4 font-medium text-slate-600">
                              {point[res.label] ? `${point[res.label].toFixed(2)}%` : <span className="text-slate-300">-</span>}
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
        <footer className="mt-20 text-center text-slate-400 text-sm pb-12">
          <p className="font-medium">&copy; 2026 AssayPlot Laboratory Tools. Built for Precision Analysis.</p>
          <p className="mt-1 opacity-60">Engine: Monotonic Cubic Spline Interpolation (High Resolution Mode)</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
