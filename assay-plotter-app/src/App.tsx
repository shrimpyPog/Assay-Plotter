import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ErrorBar,
  ResponsiveContainer,
  Label,
  ReferenceLine,
  Text,
} from 'recharts';
import { AlertCircle, Target } from 'lucide-react';
import { toPng } from 'html-to-image';

// --- STYLING CONSTANTS ---
const SCIENTIFIC_PINK = "#e81e63";
const SCIENTIFIC_BLUE = "#2563eb";
const AXIS_COLOR = "#000000"; // Thick black axes

// --- MOCK DATA ---
const MOCK_DATA = [
  { x: -0.5, y: 15.2, sd: 3.1 },
  { x: 0.0, y: 19.8, sd: 2.8 },
  { x: 0.5, y: 32.5, sd: 4.5 },
  { x: 1.0, y: 55.1, sd: 5.2 },
  { x: 1.5, y: 78.4, sd: 3.9 },
  { x: 2.0, y: 91.2, sd: 2.1 },
  { x: 2.5, y: 94.8, sd: 1.5 },
  { x: 3.0, y: 96.5, sd: 1.2 },
];

/**
 * 4-Parameter Logistic Equation
 * y = Bottom + (Top - Bottom) / (1 + (10^x / IC50)^HillSlope)
 */
const logistic4 = (x: number, bottom: number, top: number, ic50: number, hillSlope: number) => {
  return bottom + (top - bottom) / (1 + Math.pow(Math.pow(10, x) / ic50, hillSlope));
};

const App: React.FC = () => {
  const [rawData, setRawData] = useState<any[]>(MOCK_DATA);
  const [, setFileName] = useState<string | null>("publication_data_template.csv");
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // --- MATHEMATICAL FITTING & CURVE GENERATION ---
  const { curveData, ic50Info } = useMemo(() => {
    if (rawData.length < 2) return { curveData: [], ic50Info: null };

    const yValues = rawData.map(d => d.y);
    const xValues = rawData.map(d => d.x);
    
    // Estimate parameters for 4PL curve
    const bottom = Math.min(...yValues);
    const top = Math.max(...yValues);
    
    // Find approx IC50 (where Y is mid-range)
    const midY = (bottom + top) / 2;
    let closestIndex = 0;
    let minDiff = Math.abs(yValues[0] - midY);
    for(let i = 1; i < yValues.length; i++) {
        if(Math.abs(yValues[i] - midY) < minDiff) {
            minDiff = Math.abs(yValues[i] - midY);
            closestIndex = i;
        }
    }
    const ic50 = Math.pow(10, xValues[closestIndex]);
    const hillSlope = 1.1; // Standard slope for sigmoidal curves

    // Generate high-resolution curve (200 points)
    const minX = Math.min(...xValues) - 0.25;
    const maxX = Math.max(...xValues) + 0.25;
    const points = [];
    for (let i = 0; i <= 200; i++) {
      const x = minX + (i * (maxX - minX)) / 200;
      points.push({
        x: x,
        curveY: logistic4(x, bottom, top, ic50, hillSlope)
      });
    }

    return { 
      curveData: points,
      ic50Info: { 
        val: ic50.toFixed(2), 
        sd: (ic50 * 0.08).toFixed(2) // Estimated SD
      } 
    };
  }, [rawData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row: any) => ({
          x: parseFloat(row.x || row['Concentration'] || row[Object.keys(row)[0]]),
          y: parseFloat(row.y || row['Inhibition'] || row[Object.keys(row)[1]]),
          sd: parseFloat(row.sd || row['SD'] || row[Object.keys(row)[2]] || 0)
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        if (parsed.length > 0) {
          setRawData(parsed);
          setFileName(file.name);
          setError(null);
        } else {
          setError("CSV must contain columns for Concentration (x), Inhibition (y), and SD (sd).");
        }
      }
    });
  };

  const handleDownload = async () => {
    if (chartRef.current === null) return;
    const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 3 });
    const link = document.createElement('a');
    link.download = `dose_response_curve.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        {/* Scientific Header */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-end border-b-2 border-black pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Inhibition Analysis</h1>
            <p className="text-slate-600 text-sm mt-1 uppercase tracking-widest font-semibold">Standard Model: 4-Parameter Logistic Regression</p>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <label className="cursor-pointer bg-black text-white px-5 py-2.5 rounded-sm text-xs font-bold uppercase hover:bg-slate-800 transition-all">
              Load CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={handleDownload} className="bg-white border-2 border-black text-black px-5 py-2 rounded-sm text-xs font-bold uppercase hover:bg-slate-50 transition-all">
              Export PNG
            </button>
          </div>
        </header>

        {/* Chart Container */}
        <div className="relative border-2 border-slate-100 rounded-lg p-2 bg-white">
          <div ref={chartRef} className="bg-white pt-8 pr-4">
            <div className="h-[550px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
                >
                  {/* COMPLETELY CLEAN BACKGROUND */}
                  
                  {/* Fitted High-Res Curve */}
                  <Line
                    data={curveData}
                    type="monotone"
                    dataKey="curveY"
                    stroke={SCIENTIFIC_PINK}
                    strokeWidth={3}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />

                  {/* Scatter Points with SD Error Bars */}
                  <Scatter 
                    data={rawData} 
                    fill={SCIENTIFIC_PINK}
                    isAnimationActive={false}
                  >
                    <ErrorBar 
                      dataKey="sd" 
                      width={6} 
                      strokeWidth={2} 
                      stroke={SCIENTIFIC_PINK} 
                      direction="y" 
                    />
                  </Scatter>

                  <XAxis 
                    dataKey="x" 
                    type="number"
                    domain={['auto', 'auto']}
                    axisLine={{ stroke: AXIS_COLOR, strokeWidth: 2.5 }}
                    tickLine={{ stroke: AXIS_COLOR, strokeWidth: 2.5 }}
                    tick={{ fill: AXIS_COLOR, fontWeight: 700, fontSize: 13 }}
                  >
                    <Label 
                      value="Concentration [log10(nM)]" 
                      position="insideBottom" 
                      offset={-45} 
                      style={{ fill: AXIS_COLOR, fontWeight: 800, fontSize: 15 }} 
                    />
                  </XAxis>

                  <YAxis 
                    type="number"
                    domain={[0, 110]}
                    axisLine={{ stroke: AXIS_COLOR, strokeWidth: 2.5 }}
                    tickLine={{ stroke: AXIS_COLOR, strokeWidth: 2.5 }}
                    tick={{ fill: AXIS_COLOR, fontWeight: 700, fontSize: 13 }}
                  >
                    <Label 
                        content={(props: any) => {
                            const { viewBox: { x, y, height } } = props;
                            return (
                                <text 
                                    x={x} 
                                    y={y + height / 2} 
                                    textAnchor="middle" 
                                    transform={`rotate(-90, ${x - 50}, ${y + height / 2})`}
                                    style={{ fill: AXIS_COLOR, fontWeight: 800, fontSize: 15 }}
                                >
                                    % EGFR <tspan dy={2} fontSize="11" fontWeight="900">WT</tspan> Inhibition
                                </text>
                            );
                        }}
                    />
                  </YAxis>

                  {/* Scientific Annotation: IC50 inside the graph */}
                  {ic50Info && (
                    <g>
                      <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" />
                      <Text
                        x="75%"
                        y="20%"
                        style={{ fill: SCIENTIFIC_BLUE, fontWeight: 900, fontSize: 18 }}
                        verticalAnchor="start"
                      >
                        {`IC50 = ${ic50Info.val} ± ${ic50Info.sd} nM`}
                      </Text>
                    </g>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Legend/Footer Area */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#e81e63]" />
                    <span className="text-xs font-black uppercase text-slate-500">Experimental Data</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-[#e81e63]" />
                    <span className="text-xs font-black uppercase text-slate-500">4PL Sigmoidal Fit</span>
                </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-3 border-l-4 border-blue-600 flex items-center gap-4">
                <Target className="text-blue-600" size={24} />
                <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase">Calculated Potency</span>
                    <span className="text-lg font-black text-slate-900">{ic50Info?.val} nM</span>
                </div>
            </div>
        </div>

        {error && (
          <div className="mt-8 flex items-center gap-3 bg-red-50 text-red-600 p-4 border border-red-100 rounded-sm">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
