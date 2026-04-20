# Assay Plotting Tool

This repository contains tools for visualizing various biochemical assay results (e.g., DPPH, ABTS, FRAP, Alpha-Glucosidase, etc.) using Python. It generates high-resolution, publication-ready line-and-scatter plots.

## Project Structure
- `assay_plotter.py`: Executable Python script for generating plots.
- `assay_plotter.ipynb`: Jupyter Notebook for interactive analysis.
- `assay_results.csv`: Sample data file (Vertical format).
- `HRBC Job.csv`: Sample data file (Horizontal/Compound-based format).
- `requirements.txt`: Python dependencies.

## Supported Assay Types
This tool is generalized for any assay that measures inhibition, activity, or concentration across different points, including:
- **Antioxidant Assays**: DPPH, ABTS, FRAP, etc.
- **Enzyme Inhibition Assays**: Alpha-Glucosidase, Lipase, Tyrosinase, HRBC, etc.
- **Cytotoxicity Assays**: MTT, XTT, etc.

## Setup
1. Ensure you have Python installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage
### Running the Python Script
The script automatically detects the data format and can be run with optional arguments:
```bash
# Default (uses assay_results.csv)
python assay_plotter.py

# Custom input (output will be auto-named)
python assay_plotter.py "HRBC Job.csv"

# Custom input and output
python assay_plotter.py "data.csv" "my_plot.png"
```

### Running in Jupyter
Open `assay_plotter.ipynb` and run the cells. It now includes logic to handle both standard vertical layouts and compound-based horizontal layouts.

## Supported Data Formats
The tool supports two primary CSV structures:

### 1. Vertical Format (Standard)
Columns represent different samples/standards:
- `Mass (ug)` or concentration on the X-axis.
- Columns like `Std Inhibition%`, `RCE inhibition%`, etc., as Y-axis series.

### 2. Horizontal Format (Compound-based)
Rows represent different compounds:
- A `Compound` column for sample names.
- Columns named by concentration (e.g., `125 µM (%)`, `250 µM (%)`) as X-axis points.

## Output
- `[filename]_plot.png`: A 300 DPI high-resolution image file suitable for publication.
